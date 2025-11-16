export type Grade = 'MANA' | 'MPA' | 'MA';
type Meta = string;

export interface DefMedia {
    conceitoPeso: Map<Grade, number>;
    metaPeso: Map<Meta, number>;
}

export const DEFAULT_DEFMEDIA: DefMedia = {
    conceitoPeso: new Map<Grade, number>([
        ['MA', 10],
        ['MPA', 7],
        ['MANA', 4],
    ]),
    metaPeso: new Map<Meta, number>([
        ['Requirements', 1],
        ['Configuration Management', 1], 
        ['Project Management', 1],
        ['Design', 1],
        ['Tests', 1],
        ['Refactoring', 1]
    ]),
};