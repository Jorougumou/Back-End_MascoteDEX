// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u001F\u007F]/g;
const TAGS_HTML = /<[^>]*>/g;
const ANGULOS = /[<>]/g;

export function sanitizarTexto(valor: string): string {
  return valor
    .replace(TAGS_HTML, "")
    .replace(ANGULOS, "")
    .replace(CONTROLE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contemHtml(valor: string): boolean {
  return /[<>]/.test(valor);
}
