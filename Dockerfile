# ==========================================
# Stage 1: Build the React application
# ==========================================
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
# (This includes your public folder with the images and the src folder)
COPY . .

# Build the Vite application for production
RUN npm run build

# ==========================================
# Stage 2: Serve the application using Nginx
# ==========================================
FROM nginx:alpine

# Copy the built static files from the 'build' stage into Nginx's serving directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]