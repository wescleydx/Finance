Aplicativo Radar B3

Aplicativo simples desenvolvido com React Native e Expo para acompanhar cotações de ações.

O usuário pode cadastrar os códigos dos ativos que deseja acompanhar. O aplicativo exibe preço atual, variação, abertura, mínima, máxima e volume de negociação.

Os ativos cadastrados ficam salvos no aparelho e as cotações são consultadas por meio da API pública da brapi.

Foram utilizados os seguintes componentes com as definições abaixo:

RefreshControl -> É responsável por atualizar os dados deslizando o dedo na tela.

SafeAreaProvider/useSafeAreaInsets -> É responsável por limitar a área utilizada pelo aplicativo, fazendo assim, compatibilidade com diferentes tipos de smartphones.

Tecnologias utilizadas:

- React Native
- Expo
- AsyncStorage
- API brapi
