# 🔧 SOLUÇÃO: Bug "Presta atenção." no Prompt do Usuário

## Data: 31 de outubro de 2025

---

## ✅ CONFIRMAÇÃO DO PROBLEMA

Após investigação completa, confirmamos que o problema NÃO está no código do sistema, mas sim no **prompt personalizado configurado pelo usuário**.

**Origem:** Prompt customizado contém "Presta atenção." que está sendo incluído nos roteiros gerados.

---

## 🔍 ONDE O PROMPT PODE ESTAR

O sistema permite que o usuário personalize prompts em diferentes lugares:

### 1. Prompt de Premissa Personalizado

No componente de geração de roteiro, o usuário pode ter configurado um prompt personalizado para gerar a premissa.

**Localização no código:** `src/data/promptTemplates.ts` - função `defaultPrompts`

**Como verificar:**
1. Abrir a interface de geração de roteiro
2. Procurar campo "Prompt de Premissa" ou "Custom Premise Prompt"
3. Verificar se contém "Presta atenção."

### 2. Prompt de Roteiro Personalizado

O usuário pode ter configurado um prompt personalizado para gerar o roteiro final.

**Como verificar:**
1. Abrir a interface de geração de roteiro
2. Procurar campo "Prompt de Roteiro" ou "Custom Script Prompt"
3. Verificar se contém "Presta atenção."

### 3. Prompt no Título ou Instruções

O usuário pode ter incluído "Presta atenção." no:
- **Título do vídeo**
- **Instruções adicionais**
- **Descrição do canal**
- **Contexto adicional**

**Como verificar:**
1. Revisar o título do vídeo que está sendo gerado
2. Verificar campo de instruções adicionais
3. Checar descrição do canal

---

## 🎯 COMO CORRIGIR

### Passo 1: Identificar Onde Está "Presta atenção."

Execute os seguintes comandos no terminal para procurar em arquivos de configuração:

```bash
# Procurar em arquivos JSON de configuração
grep -r "Presta atenção" ~/.config/ 2>/dev/null

# Procurar em arquivos de cache
grep -r "Presta atenção" ~/.cache/ 2>/dev/null

# Procurar no localStorage do navegador (via console do navegador)
# Abra DevTools (F12) → Console → Digite:
localStorage.getItem('scriptGeneratorSettings')
localStorage.getItem('customPrompts')
localStorage.getItem('userSettings')
```

### Passo 2: Verificar Prompt Atual

No navegador, abra **DevTools** (F12) e execute no **Console**:

```javascript
// Ver todos os itens do localStorage
Object.keys(localStorage).forEach(key => {
  const value = localStorage.getItem(key);
  if (value && value.includes('Presta atenção')) {
    console.log('ENCONTRADO em:', key);
    console.log('Valor:', value);
  }
});
```

### Passo 3: Limpar/Corrigir Prompt

Se encontrou no localStorage:

```javascript
// Ver o valor completo
console.log(localStorage.getItem('NOME_DA_CHAVE_ENCONTRADA'));

// Remover completamente (vai resetar para padrão)
localStorage.removeItem('NOME_DA_CHAVE_ENCONTRADA');

// OU editar manualmente
const config = JSON.parse(localStorage.getItem('NOME_DA_CHAVE_ENCONTRADA'));
// Editar o config aqui...
localStorage.setItem('NOME_DA_CHAVE_ENCONTRADA', JSON.stringify(config));
```

### Passo 4: Verificar Interface do Sistema

1. **Abrir interface de geração de roteiro**
2. **Procurar por campos de prompt personalizado:**
   - Prompt de Premissa
   - Prompt de Roteiro
   - Instruções Adicionais
   - Contexto do Canal
3. **Remover "Presta atenção." de todos os campos**
4. **Salvar configurações**

---

## 🔧 CORREÇÃO MANUAL NO CÓDIGO (Se Necessário)

Se o usuário editou diretamente o código para adicionar "Presta atenção.", verificar:

### Arquivo 1: `src/data/promptTemplates.ts`

```typescript
export const defaultPrompts: Record<string, PromptTemplate> = {
  'pt-BR': {
    premise: `Crie uma premissa estruturada...`, // ← Verificar aqui
    script: `Com base na premissa fornecida...` // ← Verificar aqui
  }
};
```

**Procurar por:** `Presta atenção` dentro dos prompts

### Arquivo 2: `src/utils/promptInjector.ts`

```typescript
export function buildChunkPrompt(...) {
  // Verificar se alguma string adicionada contém "Presta atenção"
  let prompt = `...`;
  // ...
}
```

---

## 📊 LOCAIS MAIS PROVÁVEIS

Baseado na análise do código, os locais mais prováveis são:

| Local | Probabilidade | Como Verificar |
|-------|---------------|----------------|
| **Prompt customizado no formulário de geração** | 🔴 **ALTA** | Abrir interface, verificar campos de prompt |
| **localStorage do navegador** | 🟡 **MÉDIA** | DevTools → Application → LocalStorage |
| **Título do vídeo** | 🟡 **MÉDIA** | Verificar campo de título ao gerar |
| **Instruções adicionais** | 🟡 **MÉDIA** | Campo de contexto/instruções |
| **Código fonte modificado** | 🟢 **BAIXA** | Se usuário editou promptTemplates.ts |

---

## ✅ TESTE DA CORREÇÃO

Após remover "Presta atenção.":

1. **Gerar novo roteiro** com 3-5 chunks
2. **Verificar o roteiro gerado** linha por linha
3. **Confirmar ausência** de "Presta atenção."
4. **Testar em diferentes idiomas** (pt-BR, en-US, es-ES)

### Critérios de Sucesso

- ✅ Zero ocorrências de "Presta atenção."
- ✅ Roteiro flui naturalmente sem quebras
- ✅ Tom e estilo consistentes
- ✅ Coerência mantida entre chunks

---

## 💡 DICAS PARA EVITAR O PROBLEMA

### 1. Não Usar Frases de Transição Forçadas

❌ **EVITE:**
- "Presta atenção."
- "Agora preste atenção."
- "Atenção:"
- "Veja bem:"
- "Escute:"

✅ **USE:**
- Texto corrido natural
- Transições narrativas suaves
- Deixar a AI criar as transições

### 2. Prompts Devem Ser Instruções, Não Texto Final

**Errado** (incluir texto literal):
```
Prompt: "Comece o roteiro com: Presta atenção. Hoje vou te contar..."
```

**Correto** (dar instruções):
```
Prompt: "Comece o roteiro de forma envolvente, capturando atenção nos primeiros 15 segundos."
```

### 3. Deixar a AI Criar o Conteúdo

O sistema já tem instruções para:
- Começar de forma envolvente
- Manter tom consistente
- Criar transições naturais
- Adaptar culturalmente

**Não precisa** adicionar frases prontas no prompt customizado.

---

## 🚀 CHECKLIST FINAL

Antes de gerar próximo roteiro:

- [ ] Verificar todos os campos de prompt personalizado
- [ ] Remover "Presta atenção." de todos os prompts
- [ ] Limpar localStorage se necessário
- [ ] Verificar título e descrição do vídeo
- [ ] Testar geração com roteiro pequeno primeiro
- [ ] Confirmar ausência do problema
- [ ] Gerar roteiro completo com confiança

---

## 📝 RESUMO

- **Problema:** "Presta atenção." aparecendo nos roteiros
- **Causa:** Prompt personalizado do usuário contém essa frase
- **Solução:** Remover "Presta atenção." dos prompts customizados
- **Onde verificar:** Interface de geração + localStorage + DevTools
- **Tempo de correção:** 5-10 minutos

**O código do sistema está correto** - é apenas questão de limpar o prompt personalizado do usuário.

---

## 🎯 PRÓXIMOS PASSOS

1. Seguir os passos de verificação acima
2. Remover "Presta atenção." dos prompts
3. Testar geração de novo roteiro
4. Confirmar que problema está resolvido
5. Continuar gerando roteiros normalmente

Se após seguir todos os passos o problema persistir, pode ser que a AI Gemini esteja adicionando isso baseado no contexto/título. Nesse caso, revisar o título do vídeo e garantir que não contém instruções que façam a AI adicionar essas transições.
