 docker build -t astro-static-site:1 -f docker/prod.Dockerfile .
 docker run -d -p 80:80 --name my-app astro-static-site:1