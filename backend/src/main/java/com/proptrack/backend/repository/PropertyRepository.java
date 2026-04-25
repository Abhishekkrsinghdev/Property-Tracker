package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Property;
import com.proptrack.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {

    List<Property> findByCreatedBy(User user);

    @Query("""
        SELECT DISTINCT p FROM Property p
        LEFT JOIN PropertyPartner pp ON pp.property = p
        WHERE pp.user = :user OR p.createdBy = :user
        ORDER BY p.createdAt DESC
        """)
    List<Property> findAllAccessibleByUser(User user);
}