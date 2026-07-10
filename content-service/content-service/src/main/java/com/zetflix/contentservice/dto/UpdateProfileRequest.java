package com.zetflix.contentservice.dto;

import java.time.LocalDate;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private LocalDate dob;
}
