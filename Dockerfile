# Render builds from the repository root. Build the existing API Gateway
# without changing the service source or its existing Dockerfile.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY backend/services/api-gateway/mvnw .
COPY backend/services/api-gateway/.mvn .mvn
COPY backend/services/api-gateway/pom.xml .
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY backend/services/api-gateway/src src
RUN ./mvnw -B clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
