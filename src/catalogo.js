// Funções compartilhadas entre a listagem (index.html) e a página do produto (produto/index.html).
// Os dados vêm de trivela-house/dados/ (seleção gerada por catalogo_estatico.py na raiz do projeto),
// assim a pasta trivela-house/ é autocontida e pode ser publicada no GitHub Pages.
// A interface das páginas é feita com Alpine.js; aqui ficam só dados e formatação.

// O produtos.json guarda o preço do fornecedor em yuan (CNY); o site mostra em reais.
// Quantos reais vale 1 yuan (referência de mercado de 05/11/2026: ~R$ 0,82). Atualize quando quiser.
const COTACAO_CNY_BRL = 0.82;

// Este arquivo fica em trivela-house/src/; os dados ficam em trivela-house/dados/.
const DADOS = new URL('../dados/', document.currentScript.src);
const URL_PRODUTO = new URL('../produto/', document.currentScript.src);

const MARCAS = { nike: 'Nike', adidas: 'adidas', puma: 'Puma', mizuno: 'Mizuno', joma: 'Joma' };
// O fornecedor marca cada nome com um caractere inicial que identifica a marca.
const MARCADORES = { '氪': 'Nike', '哋': 'adidas', '骉': 'Puma', '丼': 'Mizuno', '啝': 'Joma', '瓸': 'New Balance' };
const SOLADOS = ['FG', 'AG', 'SG', 'MG', 'TF', 'IC'];
const CJK = /[⺀-鿿豈-﫿＀-￯]+/g;

function soLatino(texto) {
  return texto
    .replace(/20\d\d[上下]/g, ' ')   // "2026下" (temporada)
    .replace(CJK, ' ')
    .replace(/#/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Transforma o nome bruto do Yupoo em dados úteis para a vitrine.
// Ex.: "氪 Nike 2026下 Phantom GX III Elite TF【ID:4269091722】36-45 耐克..." →
//      titulo "Nike Phantom GX III Elite TF", marca "Nike", tamanhos 36–45, codigo "4269091722", solado "TF"
function interpretarNome(nome) {
  const bruto = (nome || '').trim();
  const codigo = (bruto.match(/ID[:：\s]*(\d+)/) || [])[1] || null;
  const faixa = bruto.match(/】\s*(\d{2})\s*-\s*(\d{2})(?!\s*cm)/i);
  const tamanhos = faixa ? { de: +faixa[1], ate: +faixa[2] } : null;

  // Título = parte antes do 【ID】; o que vem depois é a descrição em chinês.
  const corte = bruto.indexOf('【');
  let titulo = soLatino(corte > 0 ? bruto.slice(0, corte) : bruto);

  const primeira = (titulo.split(' ')[0] || '').toLowerCase();
  let marca = MARCAS[primeira];
  if (marca) titulo = marca + titulo.slice(primeira.length);
  else marca = MARCADORES[bruto[0]] || (primeira ? primeira[0].toUpperCase() + primeira.slice(1) : 'Outros');

  // Tipo de solado: procura primeiro no título, depois no nome inteiro.
  const acharSolado = (t) => SOLADOS.find((s) => new RegExp(`\\b${s}\\b`).test(t.replace(/-Pro\b/i, '').replace(/\bTURF\b/i, 'TF')));
  const solado = acharSolado(titulo) || acharSolado(soLatino(bruto)) || null;

  return { titulo: titulo || bruto, marca, tamanhos, codigo, solado };
}

// URL de uma foto (fotos/<id>/01.webp, relativo a trivela-house/dados/), codificando cada parte do caminho.
function urlFoto(arquivo) {
  return new URL(arquivo.split('/').map(encodeURIComponent).join('/'), DADOS).href;
}

function urlProduto(id) {
  return `${URL_PRODUTO.href}?id=${encodeURIComponent(id)}`;
}

const FORMATO_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Recebe o preço em yuan (como vem do produtos.json) e devolve em reais: "R$ 217,30".
function formatarPreco(precoCny) {
  if (precoCny == null) return 'Sob consulta';
  return FORMATO_BRL.format(Number(precoCny) * COTACAO_CNY_BRL);
}

// Carrega os produtos que têm fotos, já com os campos interpretados.
async function carregarProdutos() {
  const resp = await fetch(new URL('produtos.json', DADOS), { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Não consegui ler produtos.json (HTTP ${resp.status})`);
  const lista = await resp.json();
  return lista
    .filter((p) => p.arquivos && p.arquivos.length)
    .map((p) => ({ ...p, ...interpretarNome(p.nome) }));
}
