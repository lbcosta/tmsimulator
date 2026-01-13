export const CONFIG = {
    MAX_HISTORY: 2000,
    MAX_BATCH_STEPS: 5000,
    TAPE_CELL_WIDTH: 56,
    TAPE_CELL_MARGIN: 8,
    SYNTAX_REGEX: /^(\w+)\s+([^\s\/]+)\s*\/\s*([^\s,]+)\s*,\s*([RLS])\s+(\w+)(?:\s*(?:\/\/|#|;).*)?$/
};

export const THEME = {
    primary: '#ea580c', // Laranja
    success: '#10b981', // Verde
    error: '#ef4444', // Vermelho
    stroke: '#94a3b8', // Cinza
    text: '#312e81'  // Indigo
};

export const DEFAULT_CODE = `// Verificador de Palíndromos (Alfabeto {a, b})
// Aceita strings como abba, bab, aa, etc.
// Sintaxe: EstadoAtual  Lido/Escrito,Dir  ProxEstado

// Início: Lê o primeiro símbolo e decide qual caminho seguir
q0  a/_,R  q1
q0  b/_,R  q2
q0  _/_,S  ha  // Aceita string vazia

// q1: Procurando o final (tendo lido 'a')
q1 a/a,R q1
q1 b/b,R q1
q1 _/_,L q3

// q2: Procurando o final (tendo lido 'b')
q2 a/a,R q2
q2 b/b,R q2
q2 _/_,L q4

// q3: Conferindo se o último símbolo casa com 'a'
q3 a/_,L q5
q3 b/b,S hr // Rejeita
q3 _/_,S ha // Aceita (tamanho ímpar/fim)

// q4: Conferindo se o último símbolo casa com 'b'
q4 b/_,L q5
q4 a/a,S hr // Rejeita
q4 _/_,S ha // Aceita

// q5: Voltando para o início
q5 a/a,L q5
q5 b/b,L q5
q5 _/_,R q0`;

export const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'k': 'ₖ',
    'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ',
    'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
};
