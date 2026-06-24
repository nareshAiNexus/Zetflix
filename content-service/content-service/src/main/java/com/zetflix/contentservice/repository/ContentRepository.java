package com.zetflix.contentservice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zetflix.contentservice.model.Genre;
import com.zetflix.contentservice.model.Movie;

public interface ContentRepository extends JpaRepository<Movie, String>{

    List<Movie> findByGenre(Genre genre);
    List<Movie> findByTitleContainingIgnoreCase(String title);
}


