export type MeetingCheckInStatus = 'present' | 'absent';
export type MeetingCheckInMethod = 'qr' | 'manual';

export interface MeetingCheckIn {
    id: number;
    meeting_id: number;
    registration_id: number;
    status: MeetingCheckInStatus;
    method: MeetingCheckInMethod;
    checked_in_by: number | null;
    scanned_at: string | null;
}
