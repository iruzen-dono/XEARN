'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Users,
  Wallet,
  Shield,
  TrendingUp,
  Smartphone,
  CheckCircle,
  Star,
  ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';

/* ── Data ──────────────────────────────────────── */
const features = [
  { icon: Smartphone, title: 'Accessible', desc: 'Un smartphone et une connexion Internet suffisent pour commencer à gagner.' },
  { icon: Wallet, title: 'Retraits rapides', desc: 'Retirez vos gains via MTN, Flooz, TMoney ou Orange Money.' },
  { icon: Users, title: 'Parrainage 2 niveaux', desc: '40 % niveau 1, 10 % niveau 2. Gagnez sur votre réseau.' },
  { icon: TrendingUp, title: 'Revenus croissants', desc: 'Plus vous êtes actif, plus vous gagnez de récompenses.' },
  { icon: Shield, title: 'Sécurisé', desc: 'Anti-triche avancé, détection multi-comptes, données protégées.' },
  { icon: Zap, title: 'Instantané', desc: 'Validation automatique des tâches et crédits immédiats sur votre wallet.' },
];

const steps = [
  { step: '01', title: 'Inscrivez-vous', desc: 'Créez votre compte gratuitement en quelques secondes.' },
  { step: '02', title: 'Activez', desc: 'Payez 4 000 FCFA pour débloquer les retraits et l\'affiliation.' },
  { step: '03', title: 'Complétez', desc: 'Regardez des publicités et gagnez de l\'argent automatiquement.' },
  { step: '04', title: 'Retirez', desc: 'Retirez à partir de 2 000 FCFA via Mobile Money.' },
];

const stats = [
  { value: 4000, suffix: ' FCFA', label: 'pour démarrer' },
  { value: 40, suffix: '%', label: 'Commission N1' },
  { value: 2000, suffix: ' FCFA', label: 'Retrait minimum' },
];

/* ── Component ─────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <Navbar />

      {/* ─── Hero ──────────────────────────────── */}
      <section className="relative pt-32 lg:pt-44 pb-24 px-4">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-24 left-1/4 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent-500/15 rounded-full blur-[120px]"
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <MotionDiv preset="fadeUp" className="inline-block mb-8">
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-5 py-2.5 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="text-primary-300 text-sm font-medium">La plateforme #1 de micro-revenus en Afrique</span>
            </div>
          </MotionDiv>

          {/* Heading */}
          <MotionDiv preset="fadeUp" delay={0.1}>
            <h1 className="heading-xl mb-6 text-balance">
              Gagnez de l&apos;argent{' '}
              <span className="gradient-text">simplement</span>
              <br className="hidden sm:block" />
              depuis votre téléphone
            </h1>
          </MotionDiv>

          {/* Subtitle */}
          <MotionDiv preset="fadeUp" delay={0.2}>
            <p className="text-lg sm:text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Regardez des publicités, complétez des tâches et parrainez vos proches pour générer des revenus en ligne. Accessible à tous.
            </p>
          </MotionDiv>

          {/* CTA */}
          <MotionDiv preset="fadeUp" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary btn-lg group">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#how-it-works" className="btn-secondary btn-lg">
                En savoir plus
              </Link>
            </div>
          </MotionDiv>

          {/* Stats bar */}
          <MotionDiv preset="fadeUp" delay={0.45}>
            <div className="grid grid-cols-3 gap-6 sm:gap-8 mt-20 max-w-lg mx-auto">
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold gradient-text">
                    <AnimatedCounter end={s.value} suffix={s.suffix} separator=" " />
                  </div>
                  <div className="text-dark-400 text-xs sm:text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
      </section>

      {/* ─── Features ──────────────────────────── */}
      <section id="features" className="section px-4">
        <div className="max-w-7xl mx-auto">
          <MotionDiv preset="fadeUp" className="section-header">
            <p className="text-primary-400 font-semibold text-sm uppercase tracking-wider mb-3">Fonctionnalités</p>
            <h2 className="heading-lg mb-4">
              Pourquoi choisir <span className="gradient-text">XEARN</span> ?
            </h2>
            <p className="text-dark-400 leading-relaxed">
              Une plateforme pensée pour l&apos;Afrique, simple, transparente et sécurisée.
            </p>
          </MotionDiv>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f, i) => (
              <motion.div key={i} variants={staggerItem}>
                <div className="card-hover group h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                  <p className="text-dark-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────── */}
      <section id="how-it-works" className="section px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/[0.02] via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <MotionDiv preset="fadeUp" className="section-header">
            <p className="text-primary-400 font-semibold text-sm uppercase tracking-wider mb-3">Processus</p>
            <h2 className="heading-lg mb-4">
              Comment ça <span className="gradient-text">marche</span> ?
            </h2>
          </MotionDiv>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {steps.map((item, i) => (
              <motion.div key={i} variants={staggerItem} className="relative">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%+0.25rem)] w-[calc(100%-3.5rem)] h-px bg-gradient-to-r from-primary-500/30 to-transparent" />
                )}
                <div className="text-center group">
                  <div className="relative inline-flex mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-500/5 border border-primary-500/20 flex items-center justify-center group-hover:border-primary-500/40 transition-colors">
                      <span className="text-primary-400 text-xl font-bold">{item.step}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                  <p className="text-dark-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────── */}
      <section id="pricing" className="section px-4">
        <div className="max-w-5xl mx-auto">
          <MotionDiv preset="fadeUp" className="section-header">
            <p className="text-primary-400 font-semibold text-sm uppercase tracking-wider mb-3">Tarifs</p>
            <h2 className="heading-lg mb-4">
              <span className="gradient-text">Tarifs</span> simples et transparents
            </h2>
          </MotionDiv>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free plan */}
            <MotionDiv preset="fadeUp" delay={0.1}>
              <div className="card-hover h-full flex flex-col">
                <h3 className="text-xl font-bold mb-1">Gratuit</h3>
                <p className="text-dark-400 text-sm mb-4">Découvrez la plateforme</p>
                <div className="text-4xl font-extrabold mb-6">
                  0 <span className="text-lg font-normal text-dark-400">FCFA</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Accès aux tâches publicitaires', 'Consultation du wallet'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-dark-300">
                      <CheckCircle className="w-4 h-4 text-dark-500 mt-0.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                  {['Retraits', 'Affiliation'].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-dark-500 line-through">
                      <CheckCircle className="w-4 h-4 text-dark-600 mt-0.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-secondary w-full text-center">
                  Commencer
                </Link>
              </div>
            </MotionDiv>

            {/* Premium plan */}
            <MotionDiv preset="fadeUp" delay={0.2}>
              <div className="relative card-hover h-full flex flex-col gradient-border overflow-visible">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-primary-600 to-accent-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-primary-500/30">
                    <Star className="w-3 h-3" /> POPULAIRE
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">Activé</h3>
                <p className="text-dark-400 text-sm mb-4">Débloquez tout le potentiel</p>
                <div className="text-4xl font-extrabold mb-6">
                  4 000 <span className="text-lg font-normal text-dark-400">FCFA</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Toutes les tâches',
                    'Retraits illimités',
                    'Lien d\'affiliation',
                    'Commissions 40 % + 10 %',
                    'Support prioritaire',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-dark-200">
                      <CheckCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-primary w-full text-center group">
                  Activer mon compte
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </MotionDiv>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ────────────────────────── */}
      <section className="py-20 px-4">
        <MotionDiv preset="fadeUp">
          <div className="max-w-4xl mx-auto relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-accent-600/20" />
            <div className="absolute inset-0 bg-gradient-mesh" />
            <div className="relative z-10 text-center py-16 px-6 sm:px-12">
              <h2 className="heading-lg mb-4">Prêt à commencer ?</h2>
              <p className="text-dark-300 text-lg mb-8 max-w-xl mx-auto">
                Rejoignez des milliers d&apos;utilisateurs qui génèrent déjà des revenus avec XEARN.
              </p>
              <Link href="/register" className="btn-primary btn-lg group">
                Créer mon compte
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </MotionDiv>
      </section>

      {/* ─── Footer ────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary-400" />
              <span className="text-xl font-bold gradient-text">XEARN</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-dark-400">
              <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/legal/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            </div>
          </div>
          <div className="mt-8 text-center md:text-left">
            <p className="text-dark-500 text-xs">© {new Date().getFullYear()} XEARN. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
