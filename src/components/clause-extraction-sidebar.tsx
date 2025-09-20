"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    AlertTriangle,
    AlertCircle,
    FileText,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Search,
    Eye,
    MapPin
} from 'lucide-react'

interface ClauseData {
    clause_title: string
    clause_summary: string
    risk_level: "CRITICAL" | "HIGH"
    risk_explanation: string
    page_number: number
}

interface ClauseExtractionData {
    summary: string
    clauses: ClauseData[]
}

interface ClauseExtractionSidebarProps {
    data?: ClauseExtractionData
    onClauseClick?: (clause: ClauseData) => void
    onGoToPage?: (pageNumber: number) => void
    isLoading?: boolean
}

export function ClauseExtractionSidebar({
    data,
    onClauseClick,
    onGoToPage,
    isLoading = false
}: ClauseExtractionSidebarProps) {
    const [selectedClause, setSelectedClause] = useState<ClauseData | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL')
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'CRITICAL':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-700 dark:text-red-300',
                    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                    icon: 'text-red-500'
                }
            case 'HIGH':
                return {
                    bg: 'bg-amber-50 dark:bg-amber-900/20',
                    border: 'border-amber-200 dark:border-amber-800',
                    text: 'text-amber-700 dark:text-amber-300',
                    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
                    icon: 'text-amber-500'
                }
            default:
                return {
                    bg: 'bg-gray-50 dark:bg-gray-800',
                    border: 'border-gray-200 dark:border-gray-700',
                    text: 'text-gray-700 dark:text-gray-300',
                    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
                    icon: 'text-gray-500'
                }
        }
    }

    const getRiskIcon = (riskLevel: string) => {
        return riskLevel === 'CRITICAL' ? AlertTriangle : AlertCircle
    }

    const filteredClauses = data?.clauses?.filter(clause => {
        const matchesSearch = clause.clause_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clause.clause_summary.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filterRisk === 'ALL' || clause.risk_level === filterRisk
        return matchesSearch && matchesFilter
    }) || []

    const criticalCount = data?.clauses?.filter(c => c.risk_level === 'CRITICAL').length || 0
    const highCount = data?.clauses?.filter(c => c.risk_level === 'HIGH').length || 0

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r">
                <div className="p-4 border-b">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                </div>
                <div className="flex-1 p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Clause Extraction
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload a document to analyze clauses
                    </p>
                </div>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center max-w-sm">
                        <div className="relative mb-4">
                            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                <Search className="h-2 w-2 text-white" />
                            </div>
                        </div>

                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                            Ready to Extract Clauses
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                            AI will analyze your document and identify critical and high-risk clauses automatically.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r">
            {/* Compact Header */}
            <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Clause Analysis
                    </h2>
                    <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                            {data.clauses.length}
                        </Badge>
                        {criticalCount > 0 && (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs animate-pulse">
                                Action Required
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Compact Risk Overview - Always Visible */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <div>
                                <p className="text-xs font-medium text-red-700 dark:text-red-300">Critical</p>
                                <p className="text-sm font-bold text-red-600">{criticalCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <div>
                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">High Risk</p>
                                <p className="text-sm font-bold text-amber-600">{highCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Collapsible Summary Section */}
                <Card className="mb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                    <CardHeader
                        className="pb-2 cursor-pointer"
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    >
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Document Summary
                            </div>
                            {isSummaryExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </CardTitle>
                        {!isSummaryExpanded && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 line-clamp-2">
                                {data.summary}
                            </p>
                        )}
                    </CardHeader>
                    {isSummaryExpanded && (
                        <CardContent className="pt-0">
                            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                                {data.summary}
                            </p>
                        </CardContent>
                    )}
                </Card>

                {/* Compact Search and Filter */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search clauses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex space-x-1">
                        {['ALL', 'CRITICAL', 'HIGH'].map((filter) => (
                            <Button
                                key={filter}
                                variant={filterRisk === filter ? "default" : "outline"}
                                size="sm"
                                className="flex-1 text-xs py-1"
                                onClick={() => setFilterRisk(filter as any)}
                            >
                                {filter}
                            </Button>
                        ))}
                    </div>

                </div>
            </div>

            {/* Clauses List - Maximized Space */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {filteredClauses.map((clause, index) => {
                        const colors = getRiskColor(clause.risk_level)
                        const RiskIcon = getRiskIcon(clause.risk_level)
                        const isSelected = selectedClause?.clause_title === clause.clause_title

                        return (
                            <Card
                                key={index}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md clause-card ${clause.risk_level === 'CRITICAL' ? 'critical' : ''
                                    } ${colors.bg} ${colors.border} ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                                    }`}
                                onClick={() => {
                                    // Toggle selection - if already selected, deselect it
                                    if (selectedClause?.clause_title === clause.clause_title) {
                                        setSelectedClause(null)
                                    } else {
                                        setSelectedClause(clause)
                                        onClauseClick?.(clause)
                                    }
                                }}
                            >
                                <CardHeader className="pb-1">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                                            <RiskIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                                            <div className="min-w-0 flex-1">
                                                <CardTitle className={`text-xs font-medium ${colors.text} leading-tight`}>
                                                    {clause.clause_title}
                                                </CardTitle>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <Badge className={`${colors.badge} text-xs px-1 py-0`}>
                                                        {clause.risk_level}
                                                    </Badge>
                                                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <MapPin className="h-2 w-2" />
                                                        <span>P{clause.page_number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`h-3 w-3 flex-shrink-0 ${colors.icon} transition-transform ${isSelected ? 'rotate-90' : ''
                                            }`} />
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {!isSelected ? (
                                        <p className={`text-xs ${colors.text} leading-tight line-clamp-2`}>
                                            {clause.clause_summary}
                                        </p>
                                    ) : (
                                        <>
                                            <p className={`text-xs ${colors.text} leading-relaxed mb-2`}>
                                                {clause.clause_summary}
                                            </p>

                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Risk Explanation:
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                                                    {clause.risk_explanation}
                                                </p>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full py-1 h-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onGoToPage?.(clause.page_number)
                                                    }}
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Go to Page {clause.page_number}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}

                    {filteredClauses.length === 0 && (
                        <div className="text-center py-4">
                            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                No clauses match your search criteria
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}