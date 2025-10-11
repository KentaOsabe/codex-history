# syntax=docker/dockerfile:1.7

FROM ruby:3.4.3-slim AS base

ENV BUNDLE_PATH=/bundle \
    BUNDLE_BIN=/bundle/bin \
    GEM_HOME=/bundle \
    RAILS_ENV=development

ENV PATH=/app/bin:/app/node_modules/.bin:/bundle/bin:$PATH

WORKDIR /app

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
       build-essential \
       git \
       curl \
       libsqlite3-0 \
       libsqlite3-dev \
       libyaml-dev \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g corepack \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*

RUN corepack prepare pnpm@latest --activate

RUN gem install bundler \
    && gem install rails -v 8.0.3 \
    && ln -sf /bundle/bin/rails /usr/local/bin/rails \
    && ln -sf /bundle/bin/bundle /usr/local/bin/bundle

COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["bash"]
