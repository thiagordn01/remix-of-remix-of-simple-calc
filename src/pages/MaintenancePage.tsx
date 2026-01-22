import { Wrench, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenancePageProps {
    message?: string;
    onLoginClick?: () => void;
}

export default function MaintenancePage({ message, onLoginClick }: MaintenancePageProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 z-0 opacity-5">
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary animate-pulse" />
                <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-secondary animate-pulse delay-700" />
            </div>

            <div className="z-10 max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">

                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="bg-background border-4 border-yellow-500/30 p-6 rounded-full relative z-10 shadow-2xl">
                            <Wrench className="w-16 h-16 text-yellow-500 animate-bounce-slow" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                        Em Manutenção
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        {message || "Estamos realizando melhorias no sistema. Voltaremos em breve!"}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <div className="bg-card/50 backdrop-blur-sm border p-4 rounded-xl flex items-center gap-4 text-left">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Tempo Estimado</h3>
                            <p className="text-sm text-muted-foreground">Alguns minutos</p>
                        </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-sm border p-4 rounded-xl flex items-center gap-4 text-left">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Dados Seguros</h3>
                            <p className="text-sm text-muted-foreground">Nenhum dado será perdido</p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-4">É administrador?</p>
                    <Button variant="outline" onClick={onLoginClick || (() => window.location.href = '/auth')}>
                        Acessar Área Administrativa
                    </Button>
                </div>
            </div>
        </div>
    );
}
