Aplicativo Radar B3

Aplicativo simples desenvolvido com React Native e Expo para acompanhar cotações de ações.

O usuário pode cadastrar os códigos dos ativos que deseja acompanhar. O aplicativo exibe preço atual, variação, abertura, mínima, máxima e volume de negociação.

Os ativos cadastrados ficam salvos no aparelho e as cotações são consultadas por meio da API pública da brapi.

Tecnologias utilizadas:

- React Native
- Expo
- AsyncStorage
- API brapi

------------------------------------------------------------------------------------------------------------

- Armazenamento local:

O aplicativo utiliza o AsyncStorage para salvar a lista de ativos cadastrados pelo usuário.

- Atualização automática:

As cotações são atualizadas automaticamente a cada 30 segundos, conforme definido na constante:
const REFRESH_MS = 30_000;

Além da atualização automática, o usuário também pode atualizar manualmente a lista puxando a tela para baixo, por meio do RefreshControl.

- Componente principal Metric

O componente Metric exibe informações resumidas de cada ativo, como:

- preço de abertura;
- mínima e máxima do dia;
- volume negociado.

Ele também permite alterar a cor do texto de acordo com o tipo de informação, como positivo ou negativo.

- AssetCard

O componente AssetCard representa o cartão visual de cada ativo cadastrado.

Ele exibe:

código do ativo;
nome da empresa ou fundo;
preço atual;
variação percentual;
abertura;
mínima e máxima;
volume;
horário da última cotação;
botão para remover o ativo.

- Componentes principais usados na interface
SafeAreaProvider e useSafeAreaInsets

Usado para respeitar a área segura do celular.
