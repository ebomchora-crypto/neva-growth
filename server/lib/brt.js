// "Hoje" no fuso de Brasília. Use em tudo que grava ou filtra por dia: depois das 21h em Brasília
// o UTC já é o dia seguinte, e a venda ficaria datada de amanhã e fora do "Hoje".
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
const todayBRT = (now = new Date()) => DAY.format(now);

module.exports = { todayBRT };
