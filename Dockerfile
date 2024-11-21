# Use Ubuntu as the base image
FROM ubuntu:22.04

# Set an environment variables
ENV LIC_WORKDIR=/opt/lic/iac/lic-serverless-poc

# Install sudo since it's not preinstalled in minimal Ubuntu images
RUN apt-get update -y && apt-get install -y sudo

# Create a user named 'lic' with a home directory and set its default shell
RUN useradd -m -s /bin/bash lic \
    && mkdir -p /home/lic \
    && chown -R lic:lic /home/lic

# Set permissions for the directory
RUN echo "--- Building iac image" \
 && mkdir -p $LIC_WORKDIR \
 && chmod u+rwX $LIC_WORKDIR

# this relies on .dockerignore for filtering
COPY . $LIC_WORKDIR/

# Give permissions for devcontainer scripts
RUN chmod 755 $LIC_WORKDIR/.devcontainer/scripts/*.sh

# Install system dependencies and update apt
RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get install -y \
    zsh \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    jq \
    unzip \
    git \
    gcc \
    g++ \
    make \
    tar \
    libc6 \
    && apt-get clean

# Set Python3 as the default Python version
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1 && \
    update-alternatives --set python /usr/bin/python3

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && ./aws/install && rm -rf awscliv2.zip aws

# Install AWS CDK globally
RUN npm install -g aws-cdk

# Switch to the 'lic' user to set up Oh-My-Zsh and its plugins
USER lic

# Oh-my-zsh & plugins
ARG ZSH_PATH=/home/lic/.oh-my-zsh/custom
ARG PLUGINS="aws ansible docker zsh-syntax-highlighting colored-man-pages zsh-autosuggestions"

RUN curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh | bash || true && \
    mkdir -p $ZSH_PATH/plugins && \
    git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_PATH/plugins/zsh-autosuggestions" && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_PATH/plugins/zsh-syntax-highlighting" && \
    git clone https://github.com/spaceship-prompt/spaceship-prompt.git "$ZSH_PATH/themes/spaceship-prompt" --depth=1 && \
    ln -s "$ZSH_PATH/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH_PATH/themes/spaceship.zsh-theme" && \
    sed -i '/^ZSH_THEME/c\ZSH_THEME="spaceship"' /home/lic/.zshrc && \
    sed -i '/^plugins=(/ s/)$/ '"$PLUGINS"')/' /home/lic/.zshrc

# Switch back to the root user for the working directory setup
USER root

# Set up the working directory
WORKDIR $LIC_WORKDIR

# Set default shell
SHELL ["/bin/bash", "-c"]
