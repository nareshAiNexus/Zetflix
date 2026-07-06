import { create } from 'zustand';
import { fetchAllMovies } from '../api/api';

/**
 * Zustand store for global movie state.
 * Fetches from the content-service API and provides
 * helper selectors for filtering/sorting.
 */
const useMovieStore = create((set, get) => ({
  movies: [],
  isLoading: false,
  error: null,

  /**
   * Fetch all movies from the backend.
   * Called by pages on mount — skips if already loaded (unless force=true).
   */
  fetchMovies: async (force = false) => {
    const { movies, isLoading } = get();
    if (isLoading) return;
    if (movies.length > 0 && !force) return;

    set({ isLoading: true, error: null });
    try {
      const data = await fetchAllMovies();
      set({ movies: data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Get movies that are ready to stream (videoStatus === 'READY').
   */
  getReadyMovies: () => {
    return get().movies.filter(m => m.videoStatus === 'READY');
  },

  /**
   * Get the most recently created movies for the hero banner.
   * Sorted by createdAt descending, top N.
   */
  getRecentMovies: (count = 5) => {
    return [...get().movies]
      .filter(m => m.videoStatus === 'READY')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, count);
  },

  /**
   * Get movies grouped by genre.
   * Returns an object: { ACTION: [...], COMEDY: [...], ... }
   */
  getMoviesByGenre: () => {
    const grouped = {};
    get().movies.forEach(movie => {
      const genre = movie.genre || 'UNCATEGORIZED';
      if (!grouped[genre]) grouped[genre] = [];
      grouped[genre].push(movie);
    });
    return grouped;
  },

  /**
   * Get movies with PENDING video status (need video upload).
   */
  getPendingMovies: () => {
    return get().movies.filter(m => m.videoStatus === 'PENDING');
  },
}));

export default useMovieStore;
