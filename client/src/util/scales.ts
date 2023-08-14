import { Game } from "tachi-common";

const scales: Record<Game, number> = {
	iidx: 2,
	bms: 2,
	pms: 2,
	chunithm: 5,
	gitadora: 1,
	maimaidx: 1,
	maimai: 1,
	museca: 5,
	sdvx: 5,
	usc: 5,
	wacca: 5,
	popn: 4,
	jubeat: 5,
	itg: 5,
};

export function GetGradeChartExpScale(game: Game) {
	return scales[game];
}
