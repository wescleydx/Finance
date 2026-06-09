import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const WATCHLIST_KEY = '@b3_watchlist';
const REFRESH_MS = 30_000;

const palette = {
  background: '#F4F7F5',
  card: '#FFFFFF',
  dark: '#10231B',
  green: '#087A55',
  red: '#C94A4A',
  text: '#17221D',
  muted: '#6E7B75',
  border: '#DEE7E2',
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function formatMoney(value) {
  return Number.isFinite(value) ? currency.format(value) : '--';
}

function formatDecimal(value) {
  return Number.isFinite(value) ? value.toFixed(2).replace('.', ',') : '--';
}

async function requestQuote(symbol) {
  //Função para buscar os dados da API
  const response = await fetch(
    `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}`
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.results?.[0]) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'Este ativo não está disponível no acesso público da brapi.'
        : body.message || 'Cotação indisponível.'
    );
  }

  return body.results[0];
}

function Metric({ label, value, tone }) {
  // Exibe informações resumidas de cada ativo
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        selectable
        style={[
          styles.metricValue,
          tone === 'positive' && styles.positive,
          tone === 'negative' && styles.negative,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function AssetCard({ asset, quote, error, onRemove }) {
  // Representa o cartão visual de cada ativo cadastrado.
  const change = quote?.regularMarketChangePercent || 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.symbolBox}>
          <Text selectable style={styles.symbol}>
            {asset.symbol}
          </Text>
          <Text numberOfLines={1} style={styles.company}>
            {quote?.shortName || quote?.longName || 'Ativo B3'}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text selectable style={styles.price}>
            {quote ? formatMoney(quote.regularMarketPrice) : '--'}
          </Text>
          {quote ? (
            <Text
              selectable
              style={[styles.change, change >= 0 ? styles.positive : styles.negative]}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(2).replace('.', ',')}%
            </Text>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.metrics}>
        <Metric
          label="Abertura"
          value={quote ? formatMoney(quote.regularMarketOpen) : '--'}
        />
        <Metric
          label="Mín. / Máx."
          value={
            quote
              ? `${formatDecimal(quote.regularMarketDayLow)} / ${formatDecimal(
                  quote.regularMarketDayHigh
                )}`
              : '--'
          }
        />
        <Metric
          label="Volume"
          value={quote ? integer.format(quote.regularMarketVolume) : '--'}
        />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.time}>
          {quote?.regularMarketTime
            ? `Cotação: ${new Date(quote.regularMarketTime).toLocaleTimeString(
                'pt-BR',
                { hour: '2-digit', minute: '2-digit' }
              )}`
            : 'Aguardando atualização'}
        </Text>
        <Pressable hitSlop={12} onPress={() => onRemove(asset.symbol)}>
          <Text style={styles.remove}>Remover</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Home() {
  // SafeAreaProvider responsável por limitar a área utilizada pelo aplicativo, fazendo assim, compatibilidade com diferentes tipos de smartphones.
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [errors, setErrors] = useState({});
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const updateQuotes = useCallback(
    // Busca a cotação de todos os ativos cadastrados.
    async (list = assets, quiet = false) => {
      if (!list.length) {
        setLoading(false);
        return;
      }
      if (!quiet) setRefreshing(true);

      const results = await Promise.allSettled(
        list.map((asset) => requestQuote(asset.symbol))
      );
      const nextQuotes = {};
      const nextErrors = {};

      results.forEach((result, index) => {
        const currentSymbol = list[index].symbol;
        if (result.status === 'fulfilled') {
          nextQuotes[currentSymbol] = result.value;
        } else {
          nextErrors[currentSymbol] = result.reason.message;
        }
      });

      setQuotes((current) => ({ ...current, ...nextQuotes }));
      setErrors(nextErrors);
      setRefreshing(false);
      setLoading(false);
    },
    [assets]
  );

  useEffect(() => {
    async function start() {
      try {
        // O aplicativo utiliza o AsyncStorage para salvar a lista de ativos cadastrados pelo usuário.
        const savedAssets = await AsyncStorage.getItem(WATCHLIST_KEY);
        const list = savedAssets ? JSON.parse(savedAssets) : [];
        setAssets(list);
        await updateQuotes(list, true);
      } catch {
        Alert.alert('Não foi possível abrir os dados salvos.');
        setLoading(false);
      }
    }
    start();
  }, []);

  useEffect(() => {
    if (!assets.length) return undefined;
    const timer = setInterval(() => updateQuotes(assets, true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [assets, updateQuotes]);

  async function addAsset() {
    // Adicionar ações
    const cleanSymbol = symbol.trim().toUpperCase().replace('.SA', '');
    if (!/^[A-Z]{4}\d{1,2}$/.test(cleanSymbol)) {
      Alert.alert('Código inválido', 'Use um código como PETR4, SMFT3 ou MXRF11.');
      return;
    }
    if (assets.some((asset) => asset.symbol === cleanSymbol)) {
      Alert.alert('Ativo já cadastrado.');
      return;
    }

    const next = [
      ...assets,
      { symbol: cleanSymbol },
    ];
    setAssets(next);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    setSymbol('');
    Keyboard.dismiss();
    await updateQuotes(next);
  }

  function removeAsset(symbolToRemove) {
    // Remove ação da lista
    Alert.alert('Remover ativo?', symbolToRemove, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const next = assets.filter((asset) => asset.symbol !== symbolToRemove);
          setAssets(next);
          await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
        },
      },
    ]);
  }

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>MINHA CARTEIRA</Text>
            <Text style={styles.title}>Radar B3</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Ações e FIIs atualizados automaticamente a cada 30 segundos.
        </Text>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onChangeText={setSymbol}
            onSubmitEditing={addAsset}
            placeholder="Código: VALE3"
            placeholderTextColor="#8A9891"
            style={[styles.input, styles.symbolInput]}
            value={symbol}
          />
          <Pressable style={styles.addButton} onPress={addAsset}>
            <Text style={styles.addButtonText}>Adicionar</Text>
          </Pressable>
        </View>

      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 18) + 24 },
        ]}
        refreshControl={
          <RefreshControl
            colors={[palette.green]}
            onRefresh={() => updateQuotes()}
            refreshing={refreshing}
            tintColor={palette.green}
          />
        }
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={palette.green} size="large" />
            <Text style={styles.emptyText}>Buscando cotações...</Text>
          </View>
        ) : assets.length ? (
          assets.map((asset) => (
            <AssetCard
              asset={asset}
              error={errors[asset.symbol]}
              key={asset.symbol}
              onRemove={removeAsset}
              quote={quotes[asset.symbol]}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptySymbol}>R$</Text>
            <Text style={styles.emptyTitle}>Sua lista está vazia</Text>
            <Text style={styles.emptyText}>
              Digite o código de uma ação ou FII acima para começar.
            </Text>
          </View>
        )}
        <Text style={styles.disclaimer}>
          Dados fornecidos pela brapi.dev. As cotações podem ter atraso e não representam
          oferta de compra ou venda.
        </Text>
      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    // Limitação de área do aplicativo
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Estilização
  page: { flex: 1, backgroundColor: palette.background },
  hero: {
    backgroundColor: palette.dark,
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: '#80CBAE', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#B8C8C1', fontSize: 13, lineHeight: 19 },
  form: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    color: palette.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  symbolInput: { flex: 1.45, fontWeight: '700' },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25A979',
    borderRadius: 12,
    paddingHorizontal: 18,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '900' },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  symbolBox: { flex: 1 },
  symbol: { color: palette.text, fontSize: 20, fontWeight: '900' },
  company: { color: palette.muted, fontSize: 11, marginTop: 3 },
  priceBox: { alignItems: 'flex-end' },
  price: { color: palette.text, fontSize: 20, fontWeight: '900' },
  change: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  positive: { color: palette.green },
  negative: { color: palette.red },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 11,
    padding: 10,
    minHeight: 58,
  },
  metricLabel: { color: palette.muted, fontSize: 9, fontWeight: '700' },
  metricValue: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    borderTopColor: palette.border,
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: { color: palette.muted, fontSize: 10 },
  remove: { color: palette.red, fontSize: 11, fontWeight: '800' },
  error: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    color: palette.red,
    fontSize: 11,
    lineHeight: 16,
    padding: 10,
  },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 58 },
  emptySymbol: {
    color: palette.green,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 14,
  },
  emptyTitle: { color: palette.text, fontSize: 18, fontWeight: '900' },
  emptyText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  disclaimer: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 10,
    paddingTop: 6,
    textAlign: 'center',
  },
});