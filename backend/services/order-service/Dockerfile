# Multi-stage build so the final image only ships the runtime JRE + the
# built jar, not the whole Maven build toolchain. Same shape across all 13
# services (MICROSERVICES_PLAN.md Phase 2 step 10) — only the EXPOSEd port
# differs per service.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy wrapper + pom first so dependency resolution is cached in its own
# Docker layer and doesn't re-download on every source change.
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src src
RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]
