<template>
  <div class="relative" @mouseenter="showUpload" @mouseleave="hideUpload">
    <canvas
      class="canvas rounded-lg border-4 shadow-lg"
      style="border-color: rgb(110,110,110)"
      ref="canvas"
      width="840"
      height="480"
    ></canvas>

    <label for="fileUpload" class="cursor-pointer">
      <div
        v-show="uploadVisible && mode == 'upload'"
        class="absolute top-0 left-0 w-full h-full bg-gray-500 bg-opacity-75 flex items-center justify-center"
      >
        <fa-icon icon="upload" size="3x" class="text-black" />
        <input
          hidden
          ref="uploadInput"
          id="fileUpload"
          type="file"
          accept="image/*"
          @change="loadImage"
        />
      </div>
    </label>

    <div
      title="Toggle mode"
      class="absolute shadow-lg cursor-pointer bottom-0 right-0 mr-4 mb-4 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center"
      @click="toggleMode()"
    >
      <fa-icon :icon="mode == 'camera' ? 'upload' : 'camera'" class="text-white" />
    </div>
  </div>
</template>

<script>
const ASCII_RAMP_1 = " .:-=+*#%@";
const ASCII_RAMP_2 =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

export default {
  data() {
    return {
      mode: "camera", // or upload
      width: 840,
      height: 480,
      baseWidth: 0,
      baseHeight: 0,
      baseRatio: 0,
      uploadVisible: false,
      image: null,
      renderObject: null,
      ctx: null,
      tmpCanvas: null,
      tmpCtx: null,
      glyphs: {},
      gimgs: {}
    };
  },

  mounted() {
    this.baseWidth = this.width;
    this.baseHeight = this.height;
    this.baseRatio = this.width / this.height;

    this.tmpCanvas = document.createElement("canvas");
    this.tmpCtx = this.tmpCanvas.getContext("2d");

    const video = document.createElement("video");
    video.setAttribute("autoplay", true);

    navigator.mediaDevices
      .getUserMedia({ video: { width: 840, height: 480 } })
      .then(stream => {
        video.srcObject = stream;

        video.width = video.videoWidth;
        video.height = video.videoHeight;
      });

    const loop = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      if (video.width && this.mode == "camera")
        this.renderASCIIFromFrame(video, true);
      requestAnimationFrame(loop);
    };

    loop();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },

  methods: {
    resize() {
      const canvas = this.$refs["canvas"];
      const winRatio = window.innerWidth / window.innerHeight;
      const ratio = this.width / this.height;

      if (
        !(window.innerWidth < this.width || window.innerHeight < this.height)
      ) {
        canvas.style.width = `${this.width}px`;
        canvas.style.height = `${this.height}px`;
      } else if (winRatio < ratio) {
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerWidth / ratio}px`;
      } else {
        canvas.style.height = `${window.innerHeight}px`;
        canvas.style.width = `${window.innerHeight * ratio}px`;
      }
    },

    toggleMode() {
      this.mode = this.mode == "camera" ? "upload" : "camera";
      if (this.mode == "upload") {
        this.$refs["uploadInput"].click();
      }
    },

    getGlyph(char, color, w, h, size) {
      if (!this.glyphs[char]) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { antialias: false });

        canvas.width = w;
        canvas.height = h;

        ctx.font = `bold ${size || 4}px consolas`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color || "#00f";
        ctx.fillText(char, w / 2, h / 2);

        this.gimgs[char] = canvas;

        this.glyphs[char] = ctx.getImageData(0, 0, w, h).data;
      }

      return this.glyphs[char];
    },

    convertFrameToASCII(frame, ramp) {
      const { tmpCanvas: canvas, tmpCtx: ctx } = this;

      const { width, height } = this.getScaledSizeFromFrame(frame);

      // resize the temp canvas
      canvas.width = width;
      canvas.height = height;

      // draw the frame
      ctx.drawImage(frame, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;

      const groupWidth = 2;
      const groupHeight = 2;
      const groupCols = Math.round(width / groupWidth);
      const groupRows = Math.round(height / groupHeight);

      // console.time("calc");

      for (let y = 0; y < groupRows; y++) {
        let startY = y * groupHeight;
        for (let x = 0; x < groupCols; x++) {
          let startX = x * groupWidth;
          let avg = 0;
          for (let j = 0; j < groupHeight; j++) {
            for (let i = 0; i < groupWidth; i++) {
              let index =
                (startY + j) * groupCols * groupWidth * 4 + (startX + i) * 4;
              avg += data[index] + data[index + 1] + data[index + 2];
            }
          }
          avg /= groupWidth * groupHeight * 3;
          const shade = Math.max(0, (avg / 255) * 1);
          const char = ramp[Math.floor(shade * ramp.length)];

          // render the glyph
          const glyph = this.getGlyph(
            char,
            "#fff",
            groupWidth,
            groupHeight,
            groupWidth * 2
          );

          for (let j = 0; j < groupHeight; j++) {
            for (let i = 0; i < groupWidth; i++) {
              let index =
                (startY + j) * groupCols * groupWidth * 4 + (startX + i) * 4;
              let gi = j * groupWidth * 4 + j * 4;

              data[index + 0] = glyph[gi + 0];
              data[index + 1] = glyph[gi + 1];
              data[index + 2] = glyph[gi + 2];
              data[index + 3] = 255;
            }
          }
        }
      }

      // console.timeEnd("calc");

      ctx.putImageData(imageData, 0, 0);

      return canvas;
    },

    getScaledSizeFromFrame(frame) {
      const imageRatio = frame.width / frame.height;
      let w, h;

      if (imageRatio > this.baseRatio) {
        w = this.baseWidth;
        h = Math.floor(w / imageRatio);
      } else {
        h = this.baseHeight;
        w = Math.floor(imageRatio * h);
      }

      return { width: w | 0, height: h | 0 };
    },

    renderASCIIFromFrame(image) {
      const canvas = this.$refs["canvas"];
      const ctx = canvas.getContext("2d");
      const ramp = Math.random() < 0 ? ASCII_RAMP_2 : ASCII_RAMP_1;

      this.ctx = ctx;

      const frame = this.convertFrameToASCII(image, ramp);

      this.width = canvas.width = frame.width;
      this.height = canvas.height = frame.height;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.drawImage(frame, 0, 0);
    },

    loadImage({ target }) {
      const [file] = target.files;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        this.image = new Image();
        this.image.onload = () => {
          this.renderASCIIFromFrame(this.image);
          this.resize();
        };
        this.image.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    showUpload() {
      this.uploadVisible = true;
    },
    hideUpload() {
      this.uploadVisible = false;
    }
  }
};
</script>

<style lang="scss">
.bg-dark {
  background: rgb(25, 25, 25);
}

.canvas {
  image-rendering: pixelated;
}
</style>
