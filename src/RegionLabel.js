const labels = {
    ascencion: "L'Ascencion-de-Patapédia",
    stFrancoisDAssise: "St-François-d'Assise",
    stAlexisDeMatapedia: "St-Alexis-De-Matapédia",
    stAndreDeRestigouche: "St-André-de-Restigouche",
    matapedia: "Matapédia",
    pointeALaCroix: "Pointe-à-la-croix",
    pointeALaGarde: "Pointe-à-la-Garde",
    escuminac: "Escuminac",
    nouvelle: "Nouvelle",
    carletonSurMer: "Carleton-sur-mer",
    maria: "Maria",
    gesgapegiag: "Gesgapegiag",
    newRichmond: "New Richmond",
    caplan: "Caplan",
    saintSimeon: "Saint-Siméon",
    bonaventure: "Bonaventure",
    newCarlisle: "New Carlisle",
    paspebiac: "Paspébiac",
    hope: "Hope/Hope Town",
    saintGod: "Saint-Godefroi/Shigawake"
}

module.exports = {
    getForRegion: function (region) {
        return labels[region];
    }
}
