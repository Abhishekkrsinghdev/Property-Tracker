package com.proptrack.backend.service;

import com.proptrack.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "s3")
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String publicUrlPrefix;

    public S3StorageService(
            @Value("${app.storage.s3.endpoint:}") String endpoint,
            @Value("${app.storage.s3.region:us-east-1}") String region,
            @Value("${app.storage.s3.access-key:}") String accessKey,
            @Value("${app.storage.s3.secret-key:}") String secretKey,
            @Value("${app.storage.s3.bucket:proptrack}") String bucketName,
            @Value("${app.storage.s3.public-url-prefix:}") String publicUrlPrefix
    ) {
        this.bucketName = bucketName;
        // The public URL prefix is the base path to access the file (e.g. CloudFront URL or Supabase public bucket path)
        this.publicUrlPrefix = publicUrlPrefix;

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ));

        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        
        this.s3Client = builder.build();
    }

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new BadRequestException("Failed to store empty file.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf(".");
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex);
        }
        
        String key = folder + "/" + UUID.randomUUID().toString() + extension;

        try {
            PutObjectRequest putOb = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    // If using AWS S3 with standard public bucket, you might want ACL, but Supabase doesn't support ACL.
                    // .acl(ObjectCannedACL.PUBLIC_READ) 
                    .build();

            s3Client.putObject(putOb, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Construct and return the public URL
            if (publicUrlPrefix != null && !publicUrlPrefix.isEmpty()) {
                // E.g., "https://<projectId>.supabase.co/storage/v1/object/public/<bucketName>" + "/" + key
                return publicUrlPrefix.endsWith("/") ? publicUrlPrefix + key : publicUrlPrefix + "/" + key;
            } else {
                // Fallback for generic S3
                return "https://" + bucketName + ".s3." + s3Client.serviceClientConfiguration().region().id() + ".amazonaws.com/" + key;
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to construct request body from file", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to store file in S3", e);
        }
    }
}
