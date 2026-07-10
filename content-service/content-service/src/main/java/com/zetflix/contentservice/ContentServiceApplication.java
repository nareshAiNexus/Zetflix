package com.zetflix.contentservice;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.zetflix.contentservice.service.AuthService;

@SpringBootApplication
public class ContentServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ContentServiceApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedDatabase(AuthService authService) {
		return args -> {
			authService.seedAdmin();
		};
	}
}
