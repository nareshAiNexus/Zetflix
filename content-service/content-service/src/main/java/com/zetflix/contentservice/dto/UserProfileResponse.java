package com.zetflix.contentservice.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    private String id;
    private String name;
    private String email;
    private LocalDate dob;
    private int age;
    private String role;
    private List<WatchedMovieInfo> recentlyWatched;
    private WatchedMovieInfo continueWatching;
    private List<String> preferredGenres;
}
