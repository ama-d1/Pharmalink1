# Render builds from the repository root. Build the existing API Gateway
# without changing the service source or its existing Dockerfile.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY backend/services/api-gateway/pom.xml .
RUN mvn -B dependency:go-offline

COPY backend/services/api-gateway/src src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
