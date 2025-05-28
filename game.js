class FlappyBird {
    constructor() {
        console.log('Initializing game...');
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        console.log('Canvas found:', this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get canvas context!');
            return;
        }
        console.log('Canvas context obtained');
        
        // Load bird sprite
        this.birdImg = new Image();
        this.birdImg.src = 'bird.png';
        this.birdImgLoaded = false;
        this.birdImg.onload = () => {
            this.birdImgLoaded = true;
        };
        
        // Set canvas to full screen
        this.setFullScreen();
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Game state
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        
        // Bird properties
        const birdWidth = Math.max(this.canvas.width * 0.10, 120); // 18% of width, min 180px
        const birdHeight = Math.max(this.canvas.height * 0.10, 90); // 18% of height, min 120px
        this.bird = {
            x: this.canvas.width * 0.15, // 15% from left
            y: this.canvas.height / 3, // Start 1/3 from the top
            width: birdWidth,
            height: birdHeight,
            gravity: 0.09, // Slower gravity
            velocity: 0,
            jump: -5, // Slightly less bouncy jump
            hitboxPadding: 0.2 // 20% padding on all sides
        };
        
        // Pipe properties
        this.pipes = [];
        this.pipeWidth = this.canvas.width * 0.1; // Reduced from 0.15 to 0.1 (10% of screen width)
        this.pipeGap = this.canvas.height * 0.35; // Increased gap from 0.3 to 0.35 (35% of screen height)
        this.pipeSpacing = 3000; // Increased spacing between pipes (3 seconds)
        this.pipeTimer = 0;
        this.pipeSpeed = this.canvas.width * 0.002; // Reduced from 0.005 to 0.002 (0.2% of screen width per frame)
        
        // Event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('touchstart', this.handleTouch.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
        
        // Best score
        this.bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;
        document.getElementById('bestScore').textContent = `Best: ${this.bestScore}`;
        
        // Game speed
        this.gameSpeed = 1.0;
        document.getElementById('speed').textContent = `Speed: ${this.gameSpeed.toFixed(1)}x`;
        
        // Start game loop
        this.lastTime = performance.now();
        console.log('Starting game loop...');
        this.animate(this.lastTime);
    }
    
    setFullScreen() {
        // Set canvas size to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Request full screen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    }
    
    handleResize() {
        // Update canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Update game elements
        this.bird.x = this.canvas.width * 0.15;
        // Recalculate bird size with min size
        this.bird.width = Math.max(this.canvas.width * 0.10, 120);
        this.bird.height = Math.max(this.canvas.height * 0.10, 90);
        this.pipeWidth = this.canvas.width * 0.1; // Updated to match constructor
        this.pipeGap = this.canvas.height * 0.35; // Updated to match constructor
        this.pipeSpeed = this.canvas.width * 0.002; // Updated to match constructor
        // Reset game if it's running
        if (this.gameStarted) {
            this.resetGame();
        }
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scrolling
            if (this.gameOver) {
                this.resetGame();
            } else {
                this.jump();
            }
        } else if (e.code === 'F11') {
            e.preventDefault();
            this.setFullScreen();
        }
    }
    
    handleTouch(e) {
        e.preventDefault();
        if (this.gameOver) {
            this.resetGame();
        } else {
            this.jump();
        }
    }
    
    handleClick(e) {
        e.preventDefault();
        if (this.gameOver) {
            this.resetGame();
        } else {
            this.jump();
        }
    }
    
    jump() {
        if (!this.gameStarted) {
            this.gameStarted = true;
        }
        this.bird.velocity = this.bird.jump;
    }
    
    createPipe() {
        const minHeight = this.canvas.height * 0.15; // 15% of screen height
        const maxHeight = this.canvas.height - this.pipeGap - minHeight;
        const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: height,
            passed: false
        });
    }
    
    updatePipes(deltaTime) {
        this.pipeTimer += deltaTime;
        
        if (this.pipeTimer > this.pipeSpacing) {
            this.createPipe();
            this.pipeTimer = 0;
        }
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed * this.gameSpeed;
            
            // Check collision
            if (this.checkCollision(pipe)) {
                this.gameOver = true;
                // Update best score if needed
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    localStorage.setItem('flappyBestScore', this.bestScore);
                    document.getElementById('bestScore').textContent = `Best: ${this.bestScore}`;
                }
            }
            
            // Update score
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                document.getElementById('score').textContent = `Score: ${this.score}`;
                // Increase game speed
                this.gameSpeed += 0.07;
                document.getElementById('speed').textContent = `Speed: ${this.gameSpeed.toFixed(1)}x`;
            }
            
            // Remove off-screen pipes
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }
    
    checkCollision(pipe) {
        // Shrink bird hitbox for pipe collision
        const padW = this.bird.width * this.bird.hitboxPadding;
        const padH = this.bird.height * this.bird.hitboxPadding;
        const birdLeft = this.bird.x + padW;
        const birdRight = this.bird.x + this.bird.width - padW;
        const birdTop = this.bird.y + padH;
        const birdBottom = this.bird.y + this.bird.height - padH;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + this.pipeWidth;

        // Check horizontal overlap for pipe
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check vertical overlap with top or bottom pipe
            if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + this.pipeGap) {
                return true;
            }
        }
        // For ground/ceiling, use full sprite
        const fullBirdTop = this.bird.y;
        const fullBirdBottom = this.bird.y + this.bird.height;
        if (fullBirdBottom >= this.canvas.height || fullBirdTop <= 0) {
            return true;
        }
        return false;
    }
    
    updateBird() {
        if (this.gameStarted && !this.gameOver) {
            this.bird.velocity += this.bird.gravity;
            this.bird.y += this.bird.velocity;
            // Check for ground/ceiling collision
            if (this.bird.y + this.bird.height >= this.canvas.height) {
                this.bird.y = this.canvas.height - this.bird.height;
                this.bird.velocity = 0;
                this.gameOver = true;
            } else if (this.bird.y <= 0) {
                this.bird.y = 0;
                this.bird.velocity = 0;
                this.gameOver = true;
            }
        } else if (this.bird.y + this.bird.height > this.canvas.height) {
            this.bird.y = this.canvas.height - this.bird.height;
            this.bird.velocity = 0;
        } else if (this.bird.y < 0) {
            this.bird.y = 0;
            this.bird.velocity = 0;
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#70C5CE';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pipes
        this.ctx.fillStyle = '#73BF2E';
        this.pipes.forEach(pipe => {
            // Top pipe
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            // Bottom pipe
            this.ctx.fillRect(
                pipe.x,
                pipe.topHeight + this.pipeGap,
                this.pipeWidth,
                this.canvas.height - (pipe.topHeight + this.pipeGap)
            );
        });
        
        // Draw bird using sprite
        if (this.birdImgLoaded) {
            this.ctx.drawImage(
                this.birdImg,
                this.bird.x,
                this.bird.y,
                this.bird.width,
                this.bird.height
            );
        } else {
            // Fallback: draw a rectangle if image not loaded
            this.ctx.fillStyle = '#F7DC6F';
            this.ctx.fillRect(
                this.bird.x,
                this.bird.y,
                this.bird.width,
                this.bird.height
            );
        }
        
        // Draw game over screen
        if (this.gameOver) {
            document.getElementById('gameOver').classList.remove('hidden');
        } else {
            document.getElementById('gameOver').classList.add('hidden');
        }
    }
    
    resetGame() {
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.bird.y = this.canvas.height / 3;
        this.bird.velocity = 0;
        this.pipes = [];
        this.pipeTimer = 0;
        this.gameSpeed = 1.0;
        document.getElementById('score').textContent = 'Score: 0';
        document.getElementById('bestScore').textContent = `Best: ${this.bestScore}`;
        document.getElementById('speed').textContent = `Speed: ${this.gameSpeed.toFixed(1)}x`;
    }
    
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.updateBird();
        if (this.gameStarted && !this.gameOver) {
            this.updatePipes(deltaTime);
        }
        this.draw();
        
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Start the game when the page loads
console.log('Script loaded, waiting for page load...');
window.addEventListener('load', () => {
    console.log('Page loaded, creating game instance...');
    new FlappyBird();
}); 