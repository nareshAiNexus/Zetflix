# Deployment Guide

This document covers how Zetflix is deployed to AWS, why the architecture is shaped the way it is, and the exact steps to reproduce the setup from scratch.

## Table of Contents

- [Why a Single EC2 Instance Instead of EKS](#why-a-single-ec2-instance-instead-of-eks)
- [Prerequisites](#prerequisites)
- [One-Time AWS Setup](#one-time-aws-setup)
- [GitHub Actions Configuration](#github-actions-configuration)
- [The Deployment Pipeline](#the-deployment-pipeline)
- [Cost Management](#cost-management)
- [Troubleshooting](#troubleshooting)

## Why a Single EC2 Instance Instead of EKS

Zetflix is a learning project exercised intermittently — demos and interviews, not continuous production traffic. A full EKS/Kubernetes setup has meaningful fixed costs (control plane, worker nodes, load balancer, managed data services) that make sense at production scale but are wasted overhead for this usage pattern.

Instead, the entire stack — all four Spring Boot services, Kafka, Zookeeper, MySQL, Redis, and the frontend — runs as Docker containers on a single EC2 instance via Docker Compose. The CI/CD pipeline (build, test, containerize, push, deploy) is written to be deployment-target agnostic: the same pipeline stages would apply if the deploy target were swapped for EKS later, only the final deploy step would change.

## Prerequisites

- An AWS account
- A GitHub repository with this codebase
- Docker installed locally (for testing before deployment)

## One-Time AWS Setup

### 1. Create an IAM user for GitHub Actions

This user only needs permission to push images to ECR — nothing else.

1. IAM Console → Users → Create user
2. Name: `github-actions-zetflix`, no console access needed
3. Attach policy: `AmazonEC2ContainerRegistryFullAccess`
4. Security credentials tab → Create access key → choose "Application running outside AWS"
5. Save the Access Key ID and Secret Access Key — the secret is shown only once

### 2. Create ECR repositories

One private repository per service:

```
zetflix-content-service
zetflix-video-service
zetflix-encoding-service
zetflix-streaming-service
zetflix-frontend
```

Create each via ECR Console → Repositories → Create repository (Private visibility). Make sure all five are created in the **same region** you plan to run EC2 in — a region mismatch between ECR and your workflow configuration is a common source of "repository does not exist" push errors.

### 3. Create a security group

Inbound rules needed:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | Your IP, or 0.0.0.0/0 if GitHub Actions needs to SSH in directly (see note below) |
| HTTP | 80 | 0.0.0.0/0 |
| Custom TCP | 8081-8084 | 0.0.0.0/0 (only if you need direct API access outside the Nginx proxy) |

**Note on SSH source**: if your CI/CD pipeline deploys by having GitHub Actions SSH directly into the instance, the SSH rule must allow GitHub's runner IPs, which are not fixed — in practice this means allowing `0.0.0.0/0` on port 22. Since SSH still requires the private key to authenticate, this is a reasonable tradeoff for a demo project, but should not be treated as a default for a production system.

### 4. Launch the EC2 instance

- Instance type: `t3.medium` — this stack (4 JVM services + Kafka + Zookeeper + MySQL + Redis) needs more than the free-tier `t2.micro`/`t3.micro` provides. Running everything on too small an instance surfaces as JVM native memory allocation failures under load, particularly for Kafka.
- AMI: Amazon Linux 2023
- Attach the security group created above
- Create and download a new key pair (`.pem` file) — this cannot be re-downloaded later

### 5. Allocate an Elastic IP

Associate an Elastic IP with the instance so the public IP stays constant across stop/start cycles. Without this, every stop/start assigns a new IP, breaking any saved configuration (GitHub secrets, bookmarked demo links) that references the old one.

### 6. Attach an IAM role to the EC2 instance (for ECR pull access)

This is the recommended approach over placing static AWS access keys on the instance itself.

1. IAM Console → Roles → Create role → Trusted entity: AWS service → Use case: EC2
2. Attach policy: `AmazonEC2ContainerRegistryReadOnly`
3. Name it, e.g. `zetflix-ec2-ecr-role`
4. EC2 Console → select the instance → Actions → Security → Modify IAM role → select the role → Update

With this role attached, the instance can authenticate to ECR (`aws ecr get-login-password`) without any credentials file or environment variables — AWS's instance metadata service supplies temporary credentials automatically.

### 7. Install Docker on the instance

SSH in (via EC2 Instance Connect or a terminal) and run:

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
# log out and back in for the group change to take effect

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

mkdir ~/zetflix
```

### 8. Copy the compose file and environment file to the instance

```bash
scp -i your-key.pem docker-compose.yml ec2-user@<ELASTIC_IP>:~/zetflix/
scp -i your-key.pem .env ec2-user@<ELASTIC_IP>:~/zetflix/
```

See [`.env.example`](../.env.example) for the required variables. This `.env` file must never be committed to the repository.

## GitHub Actions Configuration

Add these repository secrets under Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From the IAM user created above |
| `AWS_SECRET_ACCESS_KEY` | From the same IAM user |
| `ECR_REGISTRY` | `<account-id>.dkr.ecr.<region>.amazonaws.com` |
| `EC2_HOST` | The Elastic IP of your instance |
| `EC2_SSH_KEY` | The full contents of the `.pem` file, including the BEGIN/END lines |

The workflow file lives at `.github/workflows/deploy.yml`. It builds and tests each service, pushes Docker images to ECR, then connects to the EC2 instance over SSH to pull the new images and restart the stack.

## The Deployment Pipeline

```
push to main
  -> build & test each service (parallel matrix)
  -> build Docker image per service
  -> push image to ECR
  -> SSH into EC2
  -> authenticate to ECR (via instance IAM role)
  -> docker-compose pull
  -> docker-compose up -d
```

A few implementation details worth calling out:

- The workflow uses `fail-fast: false` on the build matrix so that if one service fails to build, the others still report their own results independently, rather than being cancelled — this makes debugging a specific service's failure much faster.
- The deploy step includes `set -e` so that if any command in the deployment script fails (for example, a Docker login error), the whole step is correctly marked as failed. Without this, a failing command partway through the script can be silently swallowed, leaving the pipeline reporting success while no containers actually started.

## Cost Management

Given this project runs intermittently rather than continuously, the goal is to minimize idle cost:

- **Stop, don't terminate, the EC2 instance** between sessions. A stopped instance incurs no compute charges (only a small charge for the attached EBS volume).
- **JVM heap limits** are set explicitly for Kafka, Zookeeper, and each Spring Boot service in `docker-compose.yml` (`KAFKA_HEAP_OPTS`, `JAVA_TOOL_OPTIONS`) to keep total memory usage within what a `t3.medium` can comfortably handle, avoiding the need for a larger, more expensive instance type.
- **Elastic IP costs**: an Elastic IP is free while attached to a running instance. If released while the instance is stopped, there is no charge; if left allocated but unassociated, AWS may charge a small hourly fee. Release it if you don't plan to use the instance again soon, and re-associate before your next session.

## Troubleshooting

**"no basic auth credentials" when pulling from ECR**
The instance isn't authenticated to ECR. Confirm the IAM role is attached (`curl http://169.254.169.254/latest/meta-data/iam/security-credentials/` with an IMDSv2 token should return a role name), then re-run `aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <registry>`.

**Kafka container exits immediately with a native memory allocation error**
This means the JVM's requested heap size exceeds available instance memory. Confirm `KAFKA_HEAP_OPTS` is set in `docker-compose.yml` and that the instance has enough headroom for all services running simultaneously — see the Cost Management section for the memory budget used here.

**SSH connection times out from GitHub Actions but works from your own machine**
The security group's SSH rule is likely restricted to your personal IP. GitHub Actions runners connect from different, non-fixed IPs, so the SSH rule needs to allow broader access for the deploy step to succeed — see the security group note above.

**`docker-compose up -d` reports success but no containers appear**
Check that the compose file name referenced by the deploy script actually matches the file present on the server, and that the deploy script has `set -e` so silent mid-script failures are surfaced rather than swallowed.
