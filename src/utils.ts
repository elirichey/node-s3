import extensions from "../utilities/file-extensions";

export async function determineFileType(fileExt: string) {
  const res = (type: string) => {
    return { status: 100, message: `File Type Determined: ${type}` };
  };

  return await new Promise((resolve) => {
    let fileType: string;
    if (extensions.image.some((x) => x === `.${fileExt}`)) {
      fileType = "Image";
      console.log(res("Image"));
      return resolve(fileType);
    } else if (extensions.video.some((x) => x === `.${fileExt}`)) {
      fileType = "Video";
      console.log(res("Video"));
      return resolve(fileType);
    } else if (extensions.audio.some((x) => x === `.${fileExt}`)) {
      fileType = "Audio";
      console.log(res("Audio"));
      return resolve(fileType);
    } else if (extensions.text.some((x) => x === `.${fileExt}`)) {
      fileType = "Text";
      console.log(res("Text"));
      return resolve(fileType);
    } else {
      fileType = "";
      console.log(res("UNSET"));
      return resolve(fileType);
    }
  });
}

export function getFileNameFromPath(file: string) {
  const pathParts = file.split(/[\\/]/);
  const fileName = pathParts[pathParts.length - 1];
  return fileName;
}

