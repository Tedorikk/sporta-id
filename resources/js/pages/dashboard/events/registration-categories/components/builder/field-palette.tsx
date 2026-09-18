import {
    AlignLeft,
    Calendar,
    CheckSquare,
    ChevronDownSquare,
    CircleDot,
    FileText,
    Hash,
    Image,
    Info,
    Mail,
    Phone,
    PenLine,
    Star,
    Type,
    Users,
    VenusAndMars,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RegistrationFieldType } from '@/types/registration-category';

const PALETTE: {
    type: RegistrationFieldType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    { type: 'text', label: 'Text', icon: Type },
    { type: 'textarea', label: 'Long text', icon: AlignLeft },
    { type: 'number', label: 'Number', icon: Hash },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'phone', label: 'Phone', icon: Phone },
    { type: 'date', label: 'Date', icon: Calendar },
    { type: 'gender', label: 'Gender', icon: VenusAndMars },
    { type: 'select', label: 'Dropdown', icon: ChevronDownSquare },
    { type: 'radio', label: 'Multiple choice', icon: CircleDot },
    { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { type: 'rating', label: 'Rating', icon: Star },
    { type: 'signature', label: 'Signature', icon: PenLine },
    { type: 'file', label: 'Photo', icon: Image },
    { type: 'document', label: 'Document', icon: FileText },
    { type: 'description', label: 'Description', icon: Info },
];

interface FieldPaletteProps {
    onAdd: (type: RegistrationFieldType) => void;
    disabled?: boolean;
    /** Offer the roster block — a team category that doesn't have one yet. */
    allowRoster?: boolean;
    /** Offer the team-members block — a team category that doesn't have one yet. */
    allowTeamMembers?: boolean;
}

export function FieldPalette({
    onAdd,
    disabled,
    allowRoster = false,
    allowTeamMembers = false,
}: FieldPaletteProps) {
    const palette = [
        ...PALETTE,
        ...(allowRoster
            ? [{ type: 'roster' as const, label: 'Team roster', icon: Users }]
            : []),
        ...(allowTeamMembers
            ? [
                  {
                      type: 'team_members' as const,
                      label: 'Organize Members',
                      icon: Users,
                  },
              ]
            : []),
    ];

    return (
        <div className="space-y-1">
            <p className="px-1 text-xs font-medium text-muted-foreground uppercase">
                Add a field
            </p>
            <div className="grid grid-cols-2 gap-1.5">
                {palette.map(({ type, label, icon: Icon }) => (
                    <Button
                        key={type}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto flex-col gap-1 py-2.5"
                        onClick={() => onAdd(type)}
                        disabled={disabled}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{label}</span>
                    </Button>
                ))}
            </div>
        </div>
    );
}
