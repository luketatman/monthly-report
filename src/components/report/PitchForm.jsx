import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Target, PlusCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Pitch } from "@/entities/Pitch";

const stages = ["Meeting Scheduled", "Waiting to Hear Back", "Out for Signature", "Lost"];
const transactionTypes = ["Tenant Rep", "Buyer Rep", "Seller Rep", "Agency Leasing", "Corporate Services"];
const assetTypes = ["Industrial", "Office", "Multifamily", "Land", "IOS", "Retail", "Hospitality", "Healthcare", "Other"];
const services = ["Valuation", "Project Management", "Lease Administration", "Facility Management"];
const originationSources = ["Referral", "Broker Lead", "Marketing", "Cross-Sell", "Existing Client", "Other"];

const ENTRIES_PER_PAGE = 10;
const MAX_ENTRIES_WARNING = 50;

const emptyEntry = {
  client: "",
  budget_year_revenue_impact: "",
  total_revenue_impact: "",
  stage: "",
  summary: "",
  office_location: "",
  transaction_type: "",
  asset_type: "",
  lead_broker: "",
  square_footage: "",
  engagement_type: "One-off",
  services_involved: [],
  origination_source: "",
};

export default function PitchForm({ submission, disabled, markets }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadEntries = async () => {
      if (submission?.region && submission?.month) {
        setLoading(true);
        try {
          const data = await Pitch.filter({ region: submission.region, month: submission.month });
          setEntries(data);
        } catch (error) {
          console.error("Failed to load pitch entries:", error);
          setEntries([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadEntries();
  }, [submission?.region, submission?.month]);

  const filteredEntries = entries.filter(entry => 
    entry.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.office_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.lead_broker?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedEntries = showAll 
    ? filteredEntries 
    : filteredEntries.slice(0, currentPage * ENTRIES_PER_PAGE);

  const hasMoreEntries = filteredEntries.length > paginatedEntries.length;

  const handleUpdate = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSave = async (index) => {
    const originalEntry = { ...entries[index] };

    if (!originalEntry.id && !originalEntry.client && !originalEntry.stage && !originalEntry.office_location && !originalEntry.transaction_type && !originalEntry.asset_type && !originalEntry.lead_broker && !originalEntry.square_footage && !originalEntry.origination_source) {
      return;
    }

    try {
      const entryToSave = { ...originalEntry };
      const budgetRevenue = parseFloat(entryToSave.budget_year_revenue_impact);
      entryToSave.budget_year_revenue_impact = isNaN(budgetRevenue) ? 0 : budgetRevenue;
      const totalRevenue = parseFloat(entryToSave.total_revenue_impact);
      entryToSave.total_revenue_impact = isNaN(totalRevenue) ? 0 : totalRevenue;
      const squareFootage = parseFloat(entryToSave.square_footage);
      entryToSave.square_footage = isNaN(squareFootage) ? 0 : squareFootage;
      
      if (entryToSave.id) {
        await Pitch.update(entryToSave.id, entryToSave);
      } else {
        if (!entryToSave.client && !entryToSave.stage && !entryToSave.office_location && !entryToSave.transaction_type && !entryToSave.asset_type) return;
        const submissionId = submission.id || `regional-${submission.region}-${submission.month}`;
        const newEntry = await Pitch.create({ 
          ...entryToSave, 
          submission_id: submissionId, 
          region: submission.region, 
          month: submission.month 
        });
        const newEntries = [...entries];
        newEntries[index] = newEntry;
        setEntries(newEntries);
      }
    } catch (error) {
      console.error("Failed to save pitch entry:", error);
    }
  };

  const addEntry = () => {
    if (entries.length >= MAX_ENTRIES_WARNING) {
      if (!confirm(`You have ${entries.length} entries. Adding more may slow down performance. Continue?`)) {
        return;
      }
    }
    setEntries([{ ...emptyEntry }, ...entries]); // Add to beginning of array
    setShowAll(true);
  };

  const removeEntry = async (index) => {
    const entry = entries[index];
    try {
      if (entry.id) {
        await Pitch.delete(entry.id);
      }
      setEntries(entries.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Failed to remove pitch entry:", error);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            Loading Pitches...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="text-orange-600" />
            <div>
              <span className="text-slate-900">4. Notable Pitches (&gt; $100K)</span>
              <p className="text-sm text-slate-600 mt-1 font-normal">
                Review office submissions and add any region-specific pitches.
              </p>
              {entries.length > MAX_ENTRIES_WARNING && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ High data volume detected ({entries.length} entries). Performance may be slower.
                </p>
              )}
            </div>
          </div>
          {!disabled && (
            <Button variant="outline" size="sm" onClick={addEntry}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length > 5 && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-100 rounded-lg">
            <div className="flex-1">
              <Input
                placeholder="Search by client, office, or broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="whitespace-nowrap"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show All ({filteredEntries.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {searchTerm && (
          <div className="text-sm text-slate-600 bg-blue-50 p-2 rounded">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
        )}

        {paginatedEntries.map((entry, index) => (
          <div key={entry.id || `pitch-${index}`} className="p-4 border rounded-lg bg-slate-100 space-y-4 relative">
            {!disabled && (
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-500 hover:text-red-500" onClick={() => removeEntry(index)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Office Location</Label>
                <Select value={entry.office_location} onValueChange={value => { handleUpdate(index, 'office_location', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                    <SelectValue placeholder="Office Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map(market => <SelectItem key={market} value={market}>{market}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Client Name</Label>
                <Input placeholder="Client Name" value={entry.client} onChange={e => handleUpdate(index, 'client', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Stage</Label>
                <Select value={entry.stage} onValueChange={value => { handleUpdate(index, 'stage', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50"><SelectValue placeholder="Stage" /></SelectTrigger>
                  <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Keep existing form fields structure with labels */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Transaction Type</Label>
                <Select value={entry.transaction_type} onValueChange={value => { handleUpdate(index, 'transaction_type', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50"><SelectValue placeholder="Transaction Type" /></SelectTrigger>
                  <SelectContent>{transactionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Asset Type</Label>
                <Select value={entry.asset_type} onValueChange={value => { handleUpdate(index, 'asset_type', value); handleSave(index); }} disabled={disabled}>
                  <SelectTrigger className="bg-slate-800 text-slate-50"><SelectValue placeholder="Asset Type" /></SelectTrigger>
                  <SelectContent>{assetTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Estimated Current Year Revenue Impact</Label>
                <Input type="number" placeholder="Estimated Current Year Revenue Impact" value={entry.budget_year_revenue_impact || ''} onChange={e => handleUpdate(index, 'budget_year_revenue_impact', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Estimated Total Revenue Impact</Label>
                <Input type="number" placeholder="Estimated Total Revenue Impact" value={entry.total_revenue_impact || ''} onChange={e => handleUpdate(index, 'total_revenue_impact', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Lead Broker</Label>
                <Input placeholder="Lead Broker" value={entry.lead_broker || ""} onChange={e => handleUpdate(index, 'lead_broker', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Square Footage</Label>
                <Input type="number" placeholder="Square Footage" value={entry.square_footage || ""} onChange={e => handleUpdate(index, 'square_footage', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Engagement Type</Label>
              <RadioGroup
                value={entry.engagement_type}
                onValueChange={(value) => { handleUpdate(index, 'engagement_type', value); handleSave(index); }}
                className="flex gap-4"
                disabled={disabled}
              >
                <div className="flex items-center space-x-2"><RadioGroupItem value="One-off" id={`pitch-one-off-${index}`} className="text-blue-500 border-slate-300" /><Label htmlFor={`pitch-one-off-${index}`} className="text-slate-700">One-off</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Multi-serviced" id={`pitch-multi-${index}`} className="text-blue-500 border-slate-300" /><Label htmlFor={`pitch-multi-${index}`} className="text-slate-700">Multi-serviced</Label></div>
              </RadioGroup>
            </div>
            
            {entry.engagement_type === "Multi-serviced" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Services Involved</Label>
                <MultiSelect
                  selected={entry.services_involved || []}
                  options={services.map(s => ({ label: s, value: s }))}
                  onChange={(value) => { handleUpdate(index, 'services_involved', value); handleSave(index); }}
                  className="bg-slate-800 text-slate-50"
                  disabled={disabled}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Origination Source</Label>
              <Select value={entry.origination_source} onValueChange={value => { handleUpdate(index, 'origination_source', value); handleSave(index); }} disabled={disabled}>
                <SelectTrigger className="bg-slate-800 text-slate-50"><SelectValue placeholder="Origination Source" /></SelectTrigger>
                <SelectContent>{originationSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Pitch Summary</Label>
              <Textarea placeholder="Provide details about the pitch..." value={entry.summary} onChange={e => handleUpdate(index, 'summary', e.target.value)} disabled={disabled} onBlur={() => handleSave(index)} className="bg-slate-800 text-slate-50" />
            </div>
          </div>
        ))}

        {hasMoreEntries && !showAll && (
          <div className="text-center py-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="bg-blue-50 hover:bg-blue-100"
            >
              Load More Entries ({filteredEntries.length - paginatedEntries.length} remaining)
            </Button>
          </div>
        )}

        {entries.length === 0 && !loading && (
          <p className="text-slate-500 text-center py-4">No entries found for this period.</p>
        )}

        {filteredEntries.length === 0 && entries.length > 0 && searchTerm && (
          <p className="text-slate-500 text-center py-4">No entries match your search.</p>
        )}
      </CardContent>
    </Card>
  );
}