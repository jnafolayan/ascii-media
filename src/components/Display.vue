<template>
  <div
    class="relative mt-2 mx-auto max-w-4xl"
    @mouseenter="showUpload"
    @mouseleave="hideUpload"
  >
    <canvas
      class="canvas rounded-lg border-2 w-full mx-auto"
      style="border-color: rgb(110,110,110)"
      ref="canvas"
      width="860"
      height="480"
    ></canvas>

    <div class="flex justify-between mt-4 px-2">
      <div title="Quality" class="cursor-pointer mr-2">
        <label class="block text-left text-gray-200 text-sm"
          >Adjust quality (2 - 10)</label
        >
        <input
          class="block"
          v-model="groupSize"
          type="range"
          min="2"
          max="10"
          step="2"
        />
      </div>
      <div class="flex">
        <label
          v-if="mode == 'upload'"
          for="fileUpload"
          title="Save image"
          class="shadow-lg cursor-pointer bg-blue-600 rounded-full w-8 h-8 mr-2 flex items-center justify-center"
        >
          <fa-icon icon="upload" class="text-white" />
          <input
            hidden
            ref="uploadInput"
            id="fileUpload"
            type="file"
            accept="image/*"
            @change="loadImage"
          />
        </label>
        <div
          v-else
          title="Save frame"
          class="shadow-lg cursor-pointer bg-blue-600 rounded-full w-8 h-8 mr-2 flex items-center justify-center"
          @click="saveImage()"
        >
          <fa-icon icon="camera" class="text-white" />
        </div>
        <div
          title="Toggle mode"
          class="shadow-lg cursor-pointer bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center"
          @click="toggleMode()"
        >
          <fa-icon icon="exchange-alt" class="text-white" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const ASCII_RAMP_1 = " .:-=+*#%@";
const ASCII_RAMP_2 =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

const getUserMedia = (() => {
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    return (...args) => navigator.mediaDevices.getUserMedia(...args);
  }

  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

  if (!navigator.getUserMedia) {
    return () =>
      Promise.reject(
        "Your browser does not support the technology for this feature. Please upgrade to the latest version of Chrome or Firefox."
      );
  }

  return (...args) => {
    new Promise((resolve, reject) => {
      navigator.getUserMedia(...args, resolve, reject);
    });
  };
})();

export default {
  data() {
    return {
      mode: "camera", // or upload
      width: 860,
      height: 480,
      baseWidth: 0,
      baseHeight: 0,
      baseRatio: 0,
      uploadVisible: false,
      image: null,
      ctx: null,
      tmpCanvas: null,
      tmpCtx: null,
      glyphs: {},
      groupSize: 8,
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

    getUserMedia({ video: { width: 860, height: 480 } })
      .then((stream) => {
        video.srcObject = stream;

        video.width = video.videoWidth;
        video.height = video.videoHeight;
        setTimeout(() => this.resize(), 300);
      })
      .catch(alert);

    const loop = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      if (video.width && this.mode == "camera")
        this.renderASCIIFromFrame(video);
      else if (this.image) this.renderASCIIFromFrame(this.image);

      requestAnimationFrame(loop);
    };

    loop();
    setTimeout(() => this.resize(), 200);
    window.addEventListener("resize", () => this.resize());
  },

  methods: {
    saveImage() {
      const link = document.createElement("a");
      link.href = this.$refs["canvas"].toDataURL("image/png");
      link.download =
        "ASCII_Image_" +
        Math.random()
          .toString(32)
          .substr(2);
      link.click();
    },

    resize() {
      const canvas = this.$refs["canvas"];
      const [winWidth, winHeight] = [
        parseInt(getComputedStyle(canvas.parentElement).width, 10),
        Math.min(600, window.innerHeight * 0.8),
      ];
      const winRatio = winWidth / winHeight;
      const ratio = this.width / this.height;

      if (!(winWidth < this.width || winHeight < this.height)) {
        canvas.style.width = `${this.width}px`;
        canvas.style.height = `${this.height}px`;
      } else if (winRatio < ratio) {
        canvas.style.width = `${winWidth}px`;
        canvas.style.height = `${Math.floor(winWidth / ratio)}px`;
      } else {
        canvas.style.height = `${winHeight}px`;
        canvas.style.width = `${Math.floor(winHeight * ratio)}px`;
      }
    },

    // resize() {
    //   const canvas = this.$refs["canvas"];
    //   const winRatio = window.innerWidth / window.innerHeight;
    //   const ratio = this.width / this.height;

    //   if (
    //     !(window.innerWidth < this.width || window.innerHeight < this.height)
    //   ) {
    //     canvas.style.width = `${this.width}px`;
    //     canvas.style.height = `${this.height}px`;
    //   } else if (winRatio < ratio) {
    //     canvas.style.width = `${window.innerWidth}px`;
    //     canvas.style.height = `${Math.floor(window.innerWidth / ratio)}px`;
    //   } else {
    //     canvas.style.height = `${window.innerHeight}px`;
    //     canvas.style.width = `${Math.floor(window.innerHeight * ratio)}px`;
    //   }
    // },

    toggleMode() {
      this.mode = this.mode == "camera" ? "upload" : "camera";
      setTimeout(() => this.resize(), 200);
    },

    getGlyph(char, color, w, h, size) {
      if (!this.glyphs[char]) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { antialias: true });

        canvas.width = w;
        canvas.height = h;

        let y = h / 2;
        if (char == ".") y = h * 0.25;
        else if (char == "*") y = h * 0.75;
        else if (char == "=") size *= 0.9;
        else if (char == "@") size *= 0.9;

        ctx.font = `normal ${size}px Courier New`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color || "#00f";

        ctx.fillText(char, w / 2, y);

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

      const groupWidth = +this.groupSize;
      const groupHeight = +this.groupSize;
      const fontSize = +this.groupSize - 1;
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
              let index = (startY + j) * width * 4 + (startX + i) * 4;
              avg += data[index + 0] + data[index + 1] + data[index + 2];
            }
          }
          avg /= groupWidth * groupHeight * 3;
          const shade = avg / 255;
          const char = ramp.charAt(Math.floor(shade * ramp.length - 1));

          // render the glyph
          const glyph = this.getGlyph(
            char,
            "#fff",
            groupWidth,
            groupHeight,
            fontSize
          );

          for (let j = 0; j < groupHeight; j++) {
            for (let i = 0; i < groupWidth; i++) {
              let index = (startY + j) * width * 4 + (startX + i) * 4;
              let gi = j * groupWidth * 4 + i * 4;

              // let shade = (glyph[gi + 0] + glyph[gi + 1] + glyph[gi + 2]) / 3;
              // if (shade < 40) shade = 0;
              // else shade = 255;

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

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.drawImage(frame, 0, 0, this.width, this.height);
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
    },
  },
  watch: {
    groupSize() {
      // clear cache
      this.glyphs = {};
      setTimeout(() => this.resize(), 100);
    },
  },
};
</script>

<style lang="scss">
.bg-dark {
  background: rgb(25, 25, 25);
}

.canvas {
  image-rendering: optimizequality;
  transform: scale(-1, 1);
}
</style>
