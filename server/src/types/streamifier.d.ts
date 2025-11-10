declare module 'streamifier' {
  import { Readable } from 'stream';
  function createReadStream(buffer: Buffer): Readable;
  export { createReadStream };
  const ns: { createReadStream(buffer: Buffer): Readable };
  export default ns;
}
