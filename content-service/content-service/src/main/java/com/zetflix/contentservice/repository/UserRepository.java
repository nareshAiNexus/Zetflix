package com.zetflix.contentservice.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.zetflix.contentservice.model.User;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByResetToken(String resetToken);
}
