package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Property;
import com.proptrack.backend.entity.PropertyPartner;
import com.proptrack.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PropertyPartnerRepository extends JpaRepository<PropertyPartner, UUID> {
    List<PropertyPartner> findByProperty(Property property);
    Optional<PropertyPartner> findByPropertyAndUser(Property property, User user);
    boolean existsByPropertyAndUser(Property property, User user);
}