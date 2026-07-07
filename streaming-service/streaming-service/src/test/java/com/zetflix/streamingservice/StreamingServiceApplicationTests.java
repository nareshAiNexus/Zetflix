package com.zetflix.streamingservice;

import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class StreamingServiceApplicationTests {

	@org.springframework.beans.factory.annotation.Autowired
	private software.amazon.awssdk.services.s3.S3Client s3Client;

}
