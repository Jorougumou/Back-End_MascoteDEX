export interface StorageProvider {
  upload(arquivo: Buffer, mime: string, caminho: string): Promise<string>;
  remove(url: string): Promise<void>;
}
