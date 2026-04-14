package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Payment;
import com.proptrack.backend.entity.Property;
import com.proptrack.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByPropertyOrderByPaymentDateDesc(Property property);

    List<Payment> findByPropertyAndPaidBy(Property property, User user);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.property = :property AND p.paidBy = :user")
    BigDecimal sumByPropertyAndUser(Property property, User user);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.property = :property")
    BigDecimal sumByProperty(Property property);
}