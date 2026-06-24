package com.zetflix.contentservice.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zetflix.contentservice.dto.MovieRequest;
import com.zetflix.contentservice.dto.MovieResponse;
import com.zetflix.contentservice.model.Genre;
import com.zetflix.contentservice.model.Movie;
import com.zetflix.contentservice.model.VideoStatus;
import com.zetflix.contentservice.repository.ContentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor

public class ContentService {
    
    private final ContentRepository movieRepository;

    /*
    Add a new Movie to the Catalog
    Video is not uploaded at this stage.
    */
    public MovieResponse addMovie(MovieRequest request){
        log.info("Adding new movie: {}", request.getTitle());
 
        Movie movie = new Movie();
        movie.setTitle(request.getTitle());
        movie.setDescription(request.getDescription());
        movie.setGenre(request.getGenre());
        movie.setDirector(request.getDirector());
        movie.setCast(request.getCast());
        movie.setReleaseYear(request.getReleaseYear());
        movie.setRating(request.getRating());
        movie.setThumbnailUrl(request.getThumbnailUrl());
        movie.setDurationMinutes(request.getDurationMinutes());
        movie.setVideoStatus(VideoStatus.PENDING);

        Movie savedMovie = movieRepository.save(movie);
        log.info("Movie added with ID : {}", savedMovie.getId());

        return mapToResponse(savedMovie);
    }

    /*
     Get All movies from the Catalog and Repository
     */

    public List<MovieResponse> getAllMovies() {
        return movieRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /*
        GET Movie by ID
     */

    public MovieResponse getMovieById(String movieId){
        Movie movie = movieRepository.findById(movieId).orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));
        return mapToResponse(movie);
    }

    /**
     * GET movies by Genre
     */

    public List<MovieResponse> getMoviesByGenre(Genre genre){
        return movieRepository.findByGenre(genre)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search movie by titl
     * @param title
     * @return List<Response> 
     */

    public List<MovieResponse> searchMovies(String title){
        return movieRepository.findByTitleContainingIgnoreCase(title)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void updateVideoKey(String movieId, String videoKey){
        log.info("updating videoKey for movie: {}", movieId);
        Movie movie = movieRepository.findById(movieId).orElseThrow(() -> new RuntimeException("Movie Not found: " + movieId));
        
        movie.setVideoKey(videoKey);
        movie.setVideoStatus(VideoStatus.UPLOADED); 
        movieRepository.save(movie);
    }

    public void updateHslUrl(String movieId, String hlsUrl){
        log.info("Updating hlsurl for movie: {}", movieId);
        Movie movie = movieRepository.findById(movieId).orElseThrow(() -> new RuntimeException("Movie Not found: "+ movieId));

        movie.setHlsUrl(hlsUrl);
        movie.setVideoStatus(VideoStatus.READY);
        movieRepository.save(movie);

        log.info("Movie {} is now ready for Streaming", movieId);
    }

    private MovieResponse mapToResponse(Movie movie){
        MovieResponse response = new MovieResponse();
        response.setId(movie.getId());
        response.setTitle(movie.getTitle());
        response.setDescription(movie.getDescription());
        response.setGenre(movie.getGenre());
        response.setDirector(movie.getDirector());
        response.setCast(movie.getCast());
        response.setReleaseYear(movie.getReleaseYear());
        response.setRating(movie.getRating());
        response.setThumbnailUrl(movie.getThumbnailUrl());
        response.setDurationMinutes(movie.getDurationMinutes());
        response.setVideoKey(movie.getVideoKey());
        response.setVideoStatus(movie.getVideoStatus());
        response.setHlsUrl(movie.getHlsUrl());
        response.setCreatedAt(movie.getCreatedAt());

        return response;
    }
}   
