import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Edit3, XCircle } from 'lucide-react';

const StatusStamp = ({ status }) => {
    if (status === 'submitted') {
        return (
            <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold text-sm">SUBMITTED</span>
            </div>
        );
    }
    if (status === 'draft') {
        return (
            <div className="flex items-center gap-2 text-amber-600">
                <Edit3 className="w-5 h-5" />
                <span className="font-bold text-sm">DRAFT</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 text-slate-500">
            <XCircle className="w-5 h-5" />
            <span className="font-bold text-sm">PENDING</span>
        </div>
    );
};

export default function SubmissionWindow({ officeSubmissions, currentMonth, regionMarkets }) {
    const getStatusForMarket = (market) => {
        const submission = officeSubmissions.find(s => s.market === market && s.month === currentMonth);
        return submission ? submission.status : 'pending';
    };

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-slate-900 font-semibold leading-none tracking-tight">
                    MD Submission Window
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {regionMarkets && regionMarkets.length > 0 ? (
                    regionMarkets.map(market => (
                        <div key={market} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50">
                            <span className="font-medium text-slate-700">{market}</span>
                            <StatusStamp status={getStatusForMarket(market)} />
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 py-4">
                        No markets configured for this region.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}