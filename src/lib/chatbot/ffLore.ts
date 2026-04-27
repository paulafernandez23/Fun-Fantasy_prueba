/**
 * Base de conocimientos sobre la saga Final Fantasy para enriquecer las respuestas del chatbot.
 */
export const FF_LORE = {
  curiosidades: [
    "El nombre 'Final Fantasy' se eligió porque Hironobu Sakaguchi pensaba que sería su último proyecto en la industria antes de retirarse.",
    "El tema 'Prelude' fue compuesto por Nobuo Uematsu en apenas 10 minutos.",
    "Kefka Palazzo (FFVI) es considerado uno de los mejores villanos por ser el único que realmente logró destruir el mundo.",
    "Sephiroth y Cloud son dos caras de la misma moneda; sus diseños fueron creados por Tetsuya Nomura para ser opuestos.",
    "Los Chocobos aparecieron por primera vez en Final Fantasy II.",
    "Los Moguris (Moogles) debutaron en Final Fantasy III.",
    "Biggs y Wedge son nombres recurrentes en casi todos los juegos, en honor a personajes de Star Wars.",
    "Final Fantasy VII fue originalmente planeado para la Super Nintendo y ambientado en Nueva York."
  ],
  tcg_tips: [
    "Las cartas 'Legend' (L) suelen ser las más potentes, pero un buen mazo de 'Commons' (C) bien sinergizado puede ganar torneos.",
    "El elemento Agua se especializa en robar cartas y reactivar Backups.",
    "El elemento Fuego es ideal para estrategias agresivas y daño directo.",
    "Los mazos 'Title Format' te permiten jugar cartas de un solo juego (ej. solo FFVII) ignorando elementos.",
    "Las cartas 'Full Art' son las más buscadas por coleccionistas por su valor estético y rareza."
  ],
  mascotas: {
    chocobo: "Aves amarillas que sirven de montura. ¡Kweh!",
    moogle: "Pequeñas criaturas con un pompón y alas de murciélago. ¡Kupo!",
    cactuar: "Cactus vivientes famosos por su ataque '1000 Espinas'.",
    tonberry: "Criaturas lentas pero letales con un farol y un cuchillo de cocina."
  }
};

export const getLoreContext = (): string => {
  return `
## Conocimiento de Lore y Curiosidades (Usa esto para sorprender al usuario):
- **Curiosidades**: ${FF_LORE.curiosidades.join(' | ')}
- **Mascotas**: Chocobos (Kweh!), Moogles (Kupo!), Cactilios (1000 espinas) y Tomberis (¡cuidado con su cuchillo!).
- **TCG Tips**: ${FF_LORE.tcg_tips.join(' | ')}
`;
};
