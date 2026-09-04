/** One card's footprint on a sheet, in millimetres from the sheet's top-left corner. */
export interface PrintSlot {
    x: number;
    y: number;
    /** Sideways slots are turned a quarter turn so more cards fit on the sheet. */
    rotated: boolean;
}

/** A card size paired with a paper size, plus the layout solved for the pair. */
export interface PrintSize {
    key: string;
    label: string;
    hint: string;
    card: { key: string; label: string; width: number; height: number };
    paper: { key: string; label: string; width: number; height: number };
    slots: PrintSlot[];
    per_sheet: number;
}
