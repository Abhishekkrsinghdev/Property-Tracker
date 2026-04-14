package com.proptrack.backend.service;

import com.proptrack.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileSystemStorageService implements StorageService {

    private final Path rootLocation;
    private final String publicBaseUrl;

    public LocalFileSystemStorageService(
            @Value("${app.storage.dir:uploads}") String storageDir,
            @Value("${app.storage.local.public-base-url:}") String publicBaseUrl) {
        this.rootLocation = Paths.get(storageDir);
        this.publicBaseUrl = publicBaseUrl;
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf(".");
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }
        String filename = folder + "-" + UUID.randomUUID().toString() + extension;

        try {
            if (file.isEmpty()) {
                throw new BadRequestException("Failed to store empty file.");
            }
            Path destinationFile = this.rootLocation.resolve(Paths.get(filename))
                    .normalize().toAbsolutePath();
            if (!destinationFile.getParent().equals(this.rootLocation.toAbsolutePath())) {
                throw new BadRequestException("Cannot store file outside current directory.");
            }
            try (var inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }
            
            // Build a public URL that is reachable by both the browser and FastAPI container.
            // app.storage.local.public-base-url = http://spring-boot:8080 in Docker
            // Falls back to the current request context (http://localhost:8080) for local dev.
            String base = (publicBaseUrl != null && !publicBaseUrl.isBlank())
                    ? publicBaseUrl
                    : ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
            return base + "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file.", e);
        }
    }
}
