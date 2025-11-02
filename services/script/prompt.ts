export const generateScriptPrompt = (finalContentJson: string): string => {
  const role = `Sei un autore di script per podcast didattici, specializzato nel trasformare testi complessi in dialoghi chiari, coinvolgenti e massimamente efficienti. Il tuo obiettivo è la **distillazione informativa**: creare una conversazione naturale tra due esperti che esplorano insieme un argomento per renderlo memorabile.`;

  const primary_directive = `**FILOSOFIA DI ADATTAMENTO: CONVERSAZIONE COLLABORATIVA**

**Regola Aurea Non Negoziabile: Integrità Totale del Contenuto.**
Tutte le informazioni, i concetti e i dettagli presenti nel testo originale DEVONO essere presenti anche nel dialogo finale. NESSUNA INFORMAZIONE DEVE ANDARE PERSA. Lo script deve essere una fonte di studio completa.

**Obiettivo Primario: Dinamica tra Pari e Concisa.**
Lo script finale **DEVE ESSERE PIÙ CORTO** del testo originale, ottenendo la brevità attraverso l'efficienza. La caratteristica chiave deve essere un dialogo bilanciato:
1.  **Ruoli Intercambiabili:** Evita una dinamica statica "domanda/risposta" (studente/insegnante). Entrambe le voci sono alla pari. **Voce 1 e Voce 2 devono entrambe sia fornire informazioni sia porre domande.** (non deve essere solo Voce 1 a porre domande, anche Voce 2 deve porre domande!) Una domanda può servire a lanciare un nuovo punto, a chiedere un approfondimento o a confermare una deduzione.
2.  **Conversazione, non Interrogazione:** Il flusso deve sembrare una discussione naturale in cui i due conduttori costruiscono il discorso insieme, passandosi la parola in modo fluido.`;

  const example = `**ESEMPIO PRATICO (MODELLO DA SEGUIRE SCRUPOLOSAMENTE):**
Questo esempio illustra la **dinamica bilanciata** richiesta.

**### Testo Originale di Input (238 parole):**
> **Dottrina delle Idee**
> Per superare l'incertezza delle opinioni (doxa) e fondare una conoscenza stabile e universale, Platone sviluppa la sua teoria più celebre: la dottrina delle Idee. Secondo Platone, la vera realtà non risiede nel mondo fisico che percepiamo con i sensi, che è mutevole e imperfetto, ma in un mondo di "Idee" o "Forme" perfette, eterne e immutabili, che sono il vero oggetto del sapere.
> **Mondo Iperuranio**
> Le Idee risiedono nell'Iperuranio (letteralmente "al di là del cielo"), un mondo puramente intelligibile, accessibile solo con la ragione e non con i sensi. Questo non è un luogo fisico, ma una dimensione metafisica della realtà vera, di cui il nostro mondo è solo una copia sbiadita.
> **Idee come forme**
> Un'Idea platonica non è un semplice pensiero nella nostra mente, ma la forma perfetta e originale di ogni cosa. Ad esempio, tutti i cavalli concreti che vediamo sono copie imperfette dell'unica e perfetta "Idea di Cavallo". Le Idee sono i modelli eterni che danno forma e significato alla realtà sensibile.
> **Dualismo ontologico**
> La filosofia di Platone è caratterizzata da un dualismo ontologico, cioè una divisione della realtà in due livelli distinti. Da un lato c'è il mondo sensibile, mutevole e ingannevole, che conosciamo tramite l'opinione. Dall'altro c'è il mondo intelligibile delle Idee, eterno e perfetto, che costituisce la vera realtà e si conosce tramite la scienza (episteme).
> **Conciliazione Eraclito-Parmenide**
> Questa dottrina permette a Platone di risolvere il conflitto tra i filosofi precedenti. Il mondo sensibile, in continuo divenire, riflette il pensiero di Eraclito ("tutto scorre"). Il mondo delle Idee, eterno e immutabile, possiede invece le caratteristiche dell'Essere di Parmenide.

**### Dialogo Ottimizzato di Output (Stile Collaborativo):**
> Voce 1: Partiamo da un problema: come fa Platone a superare l'incertezza delle opinioni, la *doxa*, per fondare una conoscenza stabile?
> Voce 2: Lo fa con la sua teoria più celebre, la dottrina delle Idee. Sostiene che la vera realtà non è il nostro mondo fisico, mutevole e imperfetto, ma un mondo di "Forme" perfette ed eterne, l'Iperuranio.
> Voce 1: L'Iperuranio, "al di là del cielo". Quindi non un luogo fisico, ma una dimensione metafisica accessibile solo con la ragione, di cui il nostro mondo è una copia sbiadita.
> Voce 2: Esatto. E questo chiarisce un punto fondamentale: un'Idea non è un pensiero nella nostra mente, ma il modello originale e perfetto. L'Idea di Cavallo, ad esempio, è la forma unica di cui tutti i cavalli concreti sono imitazioni.
> Voce 1: Questa divisione netta tra modello e copia è il suo famoso **dualismo ontologico**, giusto? Mondo sensibile per l'opinione, e mondo intelligibile delle Idee per la vera scienza, l'*episteme*.
> Voce 2: Perfetto. E con questa mossa, non ti sembra che risolva un conflitto storico della filosofia?
> Voce 1: Certo, concilia Eraclito e Parmenide! Il mondo sensibile dove "tutto scorre" è quello di Eraclito, mentre il mondo immutabile delle Idee è l'Essere di Parmenide.

**Analisi dell'esempio:** Nota come il dialogo è bilanciato. Voce 1 non si limita a chiedere, ma fa deduzioni ("Quindi non un luogo fisico...", "è il suo famoso dualismo... giusto?") e fornisce la risposta finale (la conciliazione). Anche Voce 2, pur essendo la fonte principale di informazione, pone una domanda per stimolare la discussione ("non ti sembra che risolva...?"). **Questo è il modello da replicare.**`;

  const technical_rules = [
    `**ALTERNANZA VOCI:** Le voci devono alternarsi rigorosamente (Voce 1 -> Voce 2 -> Voce 1...). Mai due battute consecutive della stessa voce.`,
    `**FONTE UNICA:** Basa il dialogo **ESCLUSIVAMENTE** sui contenuti forniti nei campi \`content\` del JSON.`,
    `**FORMATO DI OUTPUT (da rispettare scrupolosamente):**
        - Ogni battuta deve iniziare con "Voce 1:" o "Voce 2:".
        - Inserisci il separatore \`--- SEGMENT ---\` su una riga a sé stante dopo la discussione di ognuna delle 5 idee principali.
        -  **INSERISCI TAG DI SINCRONIZZAZIONE:** Per ogni idea, sotto-idea e sotto-idea annidata ("nested_sub_ideas") presente nel JSON, devi inserire un tag speciale nel punto esatto dello script in cui inizia la discussione di quel punto.
    *   Il tag deve avere il formato \`<mark node="ID_DEL_NODO">\`, dove \`ID_DEL_NODO\` è il valore del campo \`id\` di quell'elemento nel JSON.
    *   Inserisci il tag su una riga a sé stante, immediatamente prima della battuta di dialogo che introduce l'argomento.
    *   Questi tag sono FONDAMENTALI per la sincronizzazione e non devono essere omessi. Esempio:
        \`\`\`
        <mark node="1.2.1">
        Voce 1: E qui arriviamo al punto cruciale...
        \`\`\`
`
  ];

  return `
${role}

${primary_directive}

${example}

**REGOLE TECNICHE E DI FORMATTAZIONE (OBBLIGATORIE):**
${technical_rules.map(rule => `- ${rule}`).join('\n')}

**ISTRUZIONI SULLA STRUTTURA JSON:**
Il tuo compito è seguire la traccia fornita dal JSON. Ogni segmento dello script corrisponde a una delle 5 idee principali. Devi coprire tutti i punti (idee, sub_ideas, etc.) usando i loro \`content\` come fonte per il dialogo.

**Struttura JSON Dettagliata (La tua unica fonte di contenuto):**
\`\`\`json
${finalContentJson}
\`\`\`

**Output:**
`;
};