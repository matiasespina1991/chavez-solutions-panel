import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Transcode a video inputPath to a single WebM outputPath with given resolution and quality settings.
 * VP9 + Opus codec as requested.
 */
function buildVideoFilter(height: number) {
  return [`scale=-2:${height}:flags=lanczos`, 'format=yuv420p'].join(',');
}

function buildPosterFilter() {
  return ['scale=1280:-2:flags=lanczos', 'format=yuv420p'].join(',');
}

export function transcodeToWebM(
  inputPath: string,
  outputPath: string,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-an',
        '-c:v libvpx-vp9',
        '-b:v 0',
        '-crf 30',
        `-vf ${buildVideoFilter(height)}`,
        '-pix_fmt yuv420p',
        '-colorspace bt709',
        '-color_primaries bt709',
        '-color_trc bt709',
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

/**
 * Generate single thumbnail (poster)from video at time 1s
 */

export function generatePoster(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-ss 1',
        '-vframes 1',
        `-vf ${buildPosterFilter()}`,
        '-c:v libwebp',
        '-quality 80',
      ])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

/**
 * Extract metadata (duration, codec, bitrate, width/height)
 */
export function probeMetadata(inputPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
