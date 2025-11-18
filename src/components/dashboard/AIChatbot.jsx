
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User } from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";
import { FinancialData, WinLoss, Pitch, PersonnelUpdate, MonthlySubmission } from "@/entities/all";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TypingIndicator = () => (
    <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
);

export default function AIChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef(null);

    const ANALYST_AVATAR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68750c97a9184209a2b6e82a/a335e6624_image.png";

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'ai',
                content: "Hello! I'm your AY Analyst, a commercial real estate performance AI. I understand your business metrics, KPIs, regional structure, and market dynamics. Ask me anything like:\n\n• 'Is their a consistent theme across regions leading to financial issues?'\n• 'Why did sentiment drop in the Northeast?'\n• 'What's driving our wins and losses?'\n• 'How many pitches have we lost to CBRE this year?'\n• 'Analyze our pipeline health'"
            }]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        // Scroll to bottom when new messages are added
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userQuestion = inputValue.trim();
        const newMessages = [...messages, { role: 'user', content: userQuestion }];
        setMessages(newMessages);
        setInputValue("");
        setIsLoading(true);

        try {
            // 1. Fetch all relevant data from entities
            const [financials, winsLosses, pitches, personnel, submissions] = await Promise.all([
                FinancialData.list("-created_date", 500),
                WinLoss.list("-created_date", 500),
                Pitch.list("-created_date", 500),
                PersonnelUpdate.list("-created_date", 500),
                MonthlySubmission.list("-created_date", 500)
            ]);

            // 2. Process and enrich the data with business intelligence
            const processedData = {
                financials: financials.map(f => ({
                    ...f,
                    budget_performance: f.monthly_budget > 0 ? ((f.monthly_revenue / f.monthly_budget) * 100) : 0,
                    reforecast_performance: f.monthly_reforecast > 0 ? ((f.monthly_revenue / f.monthly_reforecast) * 100) : 0,
                    ytd_budget_performance: f.ytd_budget > 0 ? ((f.ytd_revenue / f.ytd_budget) * 100) : 0,
                    budget_variance: (f.monthly_revenue || 0) - (f.monthly_budget || 0),
                    ytd_budget_variance: (f.ytd_revenue || 0) - (f.ytd_budget || 0)
                })),
                winsLosses: winsLosses.map(w => ({
                    ...w,
                    net_impact: w.outcome === 'Win' ? (w.budget_year_revenue_impact || 0) : -(w.budget_year_revenue_impact || 0)
                })),
                pitches,
                personnel: personnel.map(p => ({
                    ...p,
                    net_impact: (p.status === "New Hire" || p.status === "Hired") ? 
                        (p.revenue_impact || 0) : 
                        -(Math.abs(p.revenue_impact || 0))
                })),
                submissions: submissions.map(s => {
                    // Calculate average sentiment per submission
                    const assetClasses = ['office', 'retail', 'healthcare', 'industrial', 'multifamily', 'capital_markets', 'other'];
                    let avgSentiment = 0;
                    let scoreCount = 0;
                    
                    if (s.asset_class_sentiment) {
                        assetClasses.forEach(ac => {
                            if (s.asset_class_sentiment[ac]?.score) {
                                avgSentiment += s.asset_class_sentiment[ac].score;
                                scoreCount++;
                            }
                        });
                    }
                    
                    return {
                        ...s,
                        calculated_avg_sentiment: scoreCount > 0 ? avgSentiment / scoreCount : 0
                    };
                })
            };

            // 3. Add business context and calculations
            const businessContext = {
                performance_benchmarks: {
                    excellent: ">= 110% of budget",
                    good: "100-109% of budget", 
                    acceptable: "90-99% of budget",
                    concerning: "85-89% of budget",
                    poor: "< 85% of budget"
                },
                health_grades: {
                    "A+": ">= 126% of YTD budget",
                    "A": "118-125% of YTD budget",
                    "A-": "110-117% of YTD budget", 
                    "B+": "104-109% of YTD budget",
                    "B": "98-103% of YTD budget",
                    "B-": "92-97% of YTD budget",
                    "C+": "86-91% of YTD budget",
                    "C": "80-85% of YTD budget",
                    "C-": "74-79% of YTD budget",
                    "D+": "70-73% of YTD budget",
                    "D": "66-69% of YTD budget",
                    "D-": "60-65% of YTD budget",
                    "F": "< 60% of YTD budget"
                },
                sentiment_ranges: {
                    very_positive: "8-10 (Strong market confidence)",
                    positive: "6.5-7.9 (Good market conditions)",
                    neutral: "4.5-6.4 (Mixed market signals)",
                    negative: "2.5-4.4 (Concerning market conditions)",
                    very_negative: "1-2.4 (Poor market outlook)"
                },
                regional_structure: {
                    Northeast: "Traditional stronghold, established markets",
                    Central: "Growth region with diverse markets including Ohio, Pittsburgh, Austin, Dallas, Houston",  
                    South: "Expansion markets with strong growth potential",
                    West: "Includes Denver and other western markets"
                },
                business_metrics_explained: {
                    budget_year_revenue_impact: "Revenue expected to be realized in the current budget year from this deal",
                    total_revenue_impact: "Total lifetime revenue expected from this engagement",
                    win_rate: "Percentage of large brokerage assignments won vs total decided",
                    net_personnel_impact: "Net change in headcount (hires - departures)",
                    pipeline_health: "Total potential revenue from active pitches"
                }
            };

            // 4. Construct an enhanced prompt for the LLM
            const fullPrompt = `You are the AY Analyst, a senior commercial real estate performance analyst for a national brokerage firm. You have deep understanding of CRE markets, financial metrics, and business operations.

BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

CURRENT PERFORMANCE DATA:
${JSON.stringify(processedData, null, 2)}

ANALYSIS CAPABILITIES:
- Calculate win rates, budget performance, YTD progress
- Identify trends, patterns, and anomalies in the data
- Provide strategic insights based on market sentiment
- Compare regional and temporal performance
- Assess pipeline health and revenue forecasting
- Understand personnel impact on revenue
- Explain market dynamics and business drivers

RESPONSE GUIDELINES:
1. Be concise but insightful - focus on actionable intelligence
2. Use specific numbers and percentages to support your analysis  
3. Identify trends and explain "why" behind the data
4. Compare performance across regions/periods when relevant
5. Highlight both opportunities and concerns
6. Use business terminology appropriate for senior leadership
7. When discussing sentiment, reference actual asset class commentary when available

Now answer this question with strategic business insight: "${userQuestion}"`;
            
            // 5. Invoke the enhanced LLM
            const response = await InvokeLLM({ prompt: fullPrompt });
            
            setMessages([...newMessages, { role: 'ai', content: response }]);
        } catch (error) {
            console.error("Error fetching AI response:", error);
            setMessages([...newMessages, { role: 'ai', content: "I encountered an error analyzing the data. Please try rephrasing your question or ask about a specific metric." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    className="w-16 h-16 rounded-full shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-0"
                    onClick={() => setIsOpen(true)}
                >
                    <img 
                        src={ANALYST_AVATAR_URL}
                        alt="Your Analyst"
                        className="w-full h-full rounded-full object-cover"
                    />
                </Button>
                <div className="mt-2 bg-slate-800 text-white text-xs px-3 py-1 rounded-full text-center shadow-lg">
                    Ask your analyst anything
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[450px] h-[70vh] flex flex-col p-0 bg-slate-600 border-slate-500">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-500">
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <img 
                                src={ANALYST_AVATAR_URL}
                                alt="Your Analyst"
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            Chat with AY Analyst
                        </DialogTitle>
                        <DialogDescription className="text-slate-300">
                            Your intelligent CRE performance analyst.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                        <div className="space-y-6 py-4">
                            {messages.map((message, index) => (
                                <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                    {message.role === 'ai' && (
                                        <Avatar className="w-8 h-8 border border-slate-500">
                                            <AvatarImage 
                                                src={ANALYST_AVATAR_URL}
                                                alt="Your Analyst"
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-blue-100 text-blue-600"><Bot size={18} /></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'}`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {message.role === 'user' && (
                                        <Avatar className="w-8 h-8 border border-slate-500">
                                            <AvatarFallback className="bg-slate-200 text-slate-700"><User size={18} /></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-8 h-8 border border-slate-500">
                                        <AvatarImage 
                                            src={ANALYST_AVATAR_URL}
                                            alt="Your Analyst"
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-blue-100 text-blue-600"><Bot size={18} /></AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-[80%] p-3 rounded-lg bg-slate-700 text-white">
                                       <TypingIndicator />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t border-slate-500 bg-slate-600">
                        <div className="relative">
                            <Input
                                placeholder="Ask about performance, trends, strategy..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isLoading}
                                className="pr-12 h-12 bg-slate-700 border-slate-500 text-white placeholder:text-slate-400"
                            />
                            <Button
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputValue.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
