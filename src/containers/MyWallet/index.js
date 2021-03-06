/**
 *
 * Wallet - My Wallet Page
 *
 * This component defines a wallet-provided home page, with all basic information &
 * options to send/receive tokens...
 */
// ==== IMPORTS =====
// Modules
import React, { PureComponent, Fragment } from "react";
import PropTypes from "prop-types";
import { compose } from "redux";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import _get from "lodash.get";
import _isEmpty from "lodash.isempty";
import { Helmet } from "react-helmet";
// Custom Components
import AddressInfo from "./subcomponents/AddressInfo";
import DataTables from "./subcomponents/DataTables";
import SendTokenPopup from "./subcomponents/popups/SendToken";
import ReceiveTokenPopup from "./subcomponents/popups/ReceiveToken";
import SuccessPopup from "./subcomponents/popups/Success";
// Utilities & Constants
import {
  resetSendTokenForm,
  resetState,
  setTableType,
  toggleReceiveTokenPopup,
  toggleSendTokenPopup,
  toggleSuccessPopup,
  updateSendTokenInput,
  updateSendTokenErrors,
  updateSendTokenPopupStage
} from "./actions";
import {
  selectReceiveToKenPopup,
  selectSendTokenForm,
  selectSendTokenPopup,
  selectSuccessPopup,
  selectTableType,
  selectTokenOptions
} from "./selectors";
import reducer from "./reducer";
import saga from "./saga";
import {
  DOMAIN_KEY,
  SEND_TOKEN_FIELDS,
  SEND_TOKEN_STAGES,
  PORTFOLIO_COLUMNS
} from "./constants";
import {
  addBN,
  bnToDecimals,
  decimalsToBN,
  estimateFee,
  getBalance,
  getNetwork,
  getWalletInfo,
  getWeb3Info,
  injectReducer,
  injectSaga,
  mergeErrors,
  removeTrailingZero,
  sendMoney,
  sendSignedTransaction,
  sendToken,
  subBN,
  validations,
  withGlobal
} from "../../utils";
import { withIntl } from "../../components/IntlProvider";
import { withWeb3 } from "../../components/Web3";
import { selectWallet } from "../Global/selectors";
import { storeWallet } from "../Global/actions";
import { MSG, LIST, ENUM, RPC_SERVER } from "../../constants";
// ==================

// ===== MAIN COMPONENT =====
class MyWallet extends PureComponent {
  constructor(props) {
    super(props);

    this.handleAddFullAmount = this.handleAddFullAmount.bind(this);
    this.handleCloseSendTokenPopup = this.handleCloseSendTokenPopup.bind(this);
    this.handleConfirmationError = this.handleConfirmationError.bind(this);
    this.handleConfirmBeforeSend = this.handleConfirmBeforeSend.bind(this);
    this.handleGetContractData = this.handleGetContractData.bind(this);
    this.handleGetSendAction = this.handleGetSendAction.bind(this);
    this.handleOpenSendTokenPopup = this.handleOpenSendTokenPopup.bind(this);
    this.handleSendMoneyByLedger = this.handleSendMoneyByLedger.bind(this);
    this.handleSendMoneyByPK = this.handleSendMoneyByPK.bind(this);
    this.handleSendTokenByPK = this.handleSendTokenByPK.bind(this);
    this.handleTransactionError = this.handleTransactionError.bind(this);
    this.handleValidateCurrencyFee = this.handleValidateCurrencyFee.bind(this);
    this.handleValidateTrc20Fee = this.handleValidateTrc20Fee.bind(this);
    this.handleValidateTrc21Fee = this.handleValidateTrc21Fee.bind(this);
    this.handleValidationSendForm = this.handleValidationSendForm.bind(this);
  }

  componentWillUnmount() {
    const { onResetState } = this.props;
    onResetState();
  }

  handleAddFullAmount() {
    const { onUpdateSendTokenInput, sendTokenForm } = this.props;
    const rawBalance = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.BALANCE],
      0
    );
    const decimals = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.DECIMALS],
      0
    );
    const normalBalance = removeTrailingZero(
      bnToDecimals(rawBalance, decimals)
    );

    onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSFER_AMOUNT, normalBalance);
  }

  handleCloseSendTokenPopup() {
    const { onToggleSendTokenPopup } = this.props;
    onToggleSendTokenPopup(false);
  }

  handleConfirmationError(message) {
    const { onUpdateSendTokenErrors, toggleLoading } = this.props;
    toggleLoading(false);
    onUpdateSendTokenErrors({
      [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]: [message]
    });
  }

  handleConfirmBeforeSend() {
    const {
      onUpdateSendTokenErrors,
      sendTokenForm,
      toggleLoading,
      web3
    } = this.props;
    const contractData = this.handleGetContractData();
    const errorList = this.handleValidationSendForm();
    const tokenType = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.TYPE],
      ""
    );
    const isTestnet = getNetwork() === ENUM.NETWORK_TYPE.TOMOCHAIN_TESTNET;

    if (!_isEmpty(errorList)) {
      onUpdateSendTokenErrors(errorList);
    } else {
      toggleLoading(true);
      try {
        estimateFee(web3, tokenType, contractData, isTestnet).then(feeObj => {
          const type = feeObj.type;
          if (type === ENUM.TOKEN_TYPE.TRC20) {
            this.handleValidateTrc20Fee(feeObj);
          } else if (type === ENUM.TOKEN_TYPE.TRC21) {
            this.handleValidateTrc21Fee(feeObj);
          } else if (type === ENUM.TOKEN_TYPE.CURRENCY) {
            this.handleValidateCurrencyFee(feeObj);
          }
        });
      } catch (error) {
        this.handleConfirmationError(error.message);
      }
    }
  }

  handleGetContractData() {
    const { sendTokenForm, wallet } = this.props;
    const address = wallet.address;

    return {
      amount: _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT], 0),
      contractAddress: _get(
        sendTokenForm,
        [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.TOKEN_ADDRESS],
        ""
      ),
      decimals: _get(
        sendTokenForm,
        [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.DECIMALS],
        0
      ),
      from: address,
      to: _get(sendTokenForm, [SEND_TOKEN_FIELDS.RECIPIENT], ""),
      type: _get(sendTokenForm, [
        SEND_TOKEN_FIELDS.TOKEN,
        PORTFOLIO_COLUMNS.TYPE
      ])
    };
  }

  handleGetSendAction() {
    const { sendTokenForm } = this.props;
    const loginType = _get(getWeb3Info(), "loginType");
    let sendAction = () => {};

    if (loginType === ENUM.LOGIN_TYPE.LEDGER) {
      sendAction = this.handleSendMoneyByLedger;
    } else if (loginType === ENUM.LOGIN_TYPE.PRIVATE_KEY) {
      if (
        _get(sendTokenForm, [
          SEND_TOKEN_FIELDS.TOKEN,
          PORTFOLIO_COLUMNS.TYPE
        ]) === ENUM.TOKEN_TYPE.CURRENCY
      ) {
        sendAction = this.handleSendMoneyByPK;
      } else {
        sendAction = this.handleSendTokenByPK;
      }
    } else {
      sendAction = this.handleSendMoneyByPK;
    }

    return sendAction();
  }

  handleOpenSendTokenPopup(initialValues) {
    const { onToggleSendTokenPopup } = this.props;
    onToggleSendTokenPopup(true, initialValues);
  }

  handleSendMoneyByPK() {
    const {
      onStoreWallet,
      web3,
      toggleLoading,
      onToggleSuccessPopup
    } = this.props;
    const contractData = this.handleGetContractData();

    toggleLoading(true);
    sendMoney(web3, contractData)
      .then(hash => {
        getWalletInfo(web3).then(walletInfo => {
          onStoreWallet(walletInfo);
        });
        return hash;
      })
      .then(hash => {
        toggleLoading(false);
        this.handleCloseSendTokenPopup();
        onToggleSuccessPopup(true, hash);
      })
      .catch(this.handleTransactionError);
  }

  handleSendMoneyByLedger() {
    const {
      onStoreWallet,
      onToggleSuccessPopup,
      sendTokenForm,
      toggleLoading,
      web3
    } = this.props;
    const { address, hdPath } = getWeb3Info();
    const contract = this.handleGetContractData();
    const networkKey = getNetwork() || ENUM.NETWORK_TYPE.TOMOCHAIN_MAINNET;
    const serverConfig = _get(RPC_SERVER, [networkKey]);
    const gasPrice = _get(sendTokenForm, [
      SEND_TOKEN_FIELDS.TRANSACTION_FEE,
      "gasPrice"
    ]);
    const gas = _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSACTION_FEE, "gas"]);

    toggleLoading(true);
    sendSignedTransaction(web3, {
      ...contract,
      chainId: serverConfig.networkId,
      gas,
      gasPrice,
      hdPath
    })
      .then(txObj => {
        getBalance(address, serverConfig).then(balance => {
          onStoreWallet({
            address,
            balance
          });
        });
        toggleLoading(false);
        this.handleCloseSendTokenPopup();
        onToggleSuccessPopup(true, txObj);
      })
      .catch(this.handleTransactionError);
  }

  handleSendTokenByPK() {
    const { onToggleSuccessPopup, toggleLoading, web3 } = this.props;
    const contractData = this.handleGetContractData();

    sendToken(web3, contractData)
      .then(hash => {
        toggleLoading(false);
        return hash;
      })
      .then(hash => {
        this.handleCloseSendTokenPopup();
        onToggleSuccessPopup(true, hash);
      })
      .catch(this.handleTransactionError);
  }

  handleTransactionError(error) {
    const { onUpdateSendTokenErrors, toggleLoading } = this.props;
    toggleLoading(false);
    onUpdateSendTokenErrors({ error: [error.message] });
  }

  handleValidateCurrencyFee(feeObj) {
    const {
      intl: { formatMessage },
      onUpdateSendTokenInput,
      onUpdateSendTokenPopupStage,
      sendTokenForm,
      toggleLoading,
      web3
    } = this.props;
    const decimals = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.DECIMALS],
      0
    );
    const balance = _get(sendTokenForm, [
      SEND_TOKEN_FIELDS.TOKEN,
      PORTFOLIO_COLUMNS.BALANCE
    ]);
    const remainBalance = subBN(
      web3.utils.toBN(balance),
      addBN(
        _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
        feeObj.amount,
        decimals
      ),
      decimals
    );

    if (
      balance ===
      decimalsToBN(
        _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
        decimals
      )
    ) {
      const remainAmount = subBN(
        web3.utils.toBN(balance),
        feeObj.amount,
        decimals
      );

      if (web3.utils.toBN(decimalsToBN(remainAmount, decimals)).isNeg()) {
        this.handleConfirmationError(
          formatMessage(
            MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_INSUFFICIENT_FEE_FROM_CURRENCY
          )
        );
      } else {
        toggleLoading(false);
        onUpdateSendTokenInput(
          SEND_TOKEN_FIELDS.TRANSFER_AMOUNT,
          removeTrailingZero(remainAmount)
        );
        onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSACTION_FEE, feeObj);
        onUpdateSendTokenPopupStage(SEND_TOKEN_STAGES.CONFIRMATION);
      }
    } else if (web3.utils.toBN(decimalsToBN(remainBalance, decimals)).isNeg()) {
      this.handleConfirmationError(
        formatMessage(
          MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_INSUFFICIENT_FEE_FROM_CURRENCY
        )
      );
    } else {
      toggleLoading(false);
      onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSACTION_FEE, feeObj);
      onUpdateSendTokenPopupStage(SEND_TOKEN_STAGES.CONFIRMATION);
    }
  }

  handleValidateTrc20Fee(feeObj) {
    const {
      intl: { formatMessage },
      onUpdateSendTokenInput,
      onUpdateSendTokenPopupStage,
      sendTokenForm,
      toggleLoading,
      wallet,
      web3
    } = this.props;
    const decimals = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.DECIMALS],
      0
    );
    const remainBalance = subBN(
      web3.utils.toBN(_get(wallet, "balance")),
      feeObj.amount,
      decimals
    );

    if (web3.utils.toBN(decimalsToBN(remainBalance, decimals)).isNeg()) {
      this.handleConfirmationError(
        formatMessage(
          MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_INSUFFICIENT_FEE_FROM_CURRENCY
        )
      );
    } else {
      toggleLoading(false);
      onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSACTION_FEE, feeObj);
      onUpdateSendTokenPopupStage(SEND_TOKEN_STAGES.CONFIRMATION);
    }
  }

  handleValidateTrc21Fee(feeObj) {
    const {
      intl: { formatMessage },
      onUpdateSendTokenInput,
      onUpdateSendTokenPopupStage,
      sendTokenForm,
      toggleLoading,
      web3
    } = this.props;
    const decimals = _get(
      sendTokenForm,
      [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.DECIMALS],
      0
    );
    const balance = _get(sendTokenForm, [
      SEND_TOKEN_FIELDS.TOKEN,
      PORTFOLIO_COLUMNS.BALANCE
    ]);
    const remainBalance = subBN(
      web3.utils.toBN(balance),
      addBN(
        _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
        feeObj.amount,
        decimals
      ),
      decimals
    );

    if (
      balance ===
      decimalsToBN(
        _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
        decimals
      )
    ) {
      toggleLoading(false);
      const remainAmount = subBN(
        web3.utils.toBN(balance),
        feeObj.amount,
        decimals
      );
      onUpdateSendTokenInput(
        SEND_TOKEN_FIELDS.TRANSFER_AMOUNT,
        removeTrailingZero(remainAmount)
      );
      onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSACTION_FEE, feeObj);
      onUpdateSendTokenPopupStage(SEND_TOKEN_STAGES.CONFIRMATION);
    } else if (web3.utils.toBN(decimalsToBN(remainBalance, decimals)).isNeg()) {
      this.handleConfirmationError(
        formatMessage(
          MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_INSUFFICIENT_FEE_FROM_CURRENCY
        )
      );
    } else {
      toggleLoading(false);
      onUpdateSendTokenInput(SEND_TOKEN_FIELDS.TRANSACTION_FEE, feeObj);
      onUpdateSendTokenPopupStage(SEND_TOKEN_STAGES.CONFIRMATION);
    }
  }

  handleValidationSendForm() {
    const {
      intl: { formatMessage },
      sendTokenForm
    } = this.props;
    const {
      isWalletAddress,
      isMaxLength,
      isMaxNumber,
      isMinNumber,
      isRequired
    } = validations;

    const errorList = mergeErrors([
      isRequired(
        {
          name: SEND_TOKEN_FIELDS.TOKEN,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.TOKEN])
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_TOKEN_REQUIRED)
      ),
      isRequired(
        {
          name: SEND_TOKEN_FIELDS.RECIPIENT,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.RECIPIENT])
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_RECIPIENT_REQUIRED)
      ),
      isWalletAddress(
        {
          name: SEND_TOKEN_FIELDS.RECIPIENT,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.RECIPIENT])
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_RECIPIENT_INVALID)
      ),
      isRequired(
        {
          name: SEND_TOKEN_FIELDS.TRANSFER_AMOUNT,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT])
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_AMOUNT_REQUIRED)
      ),
      isMaxNumber(
        {
          name: SEND_TOKEN_FIELDS.TRANSFER_AMOUNT,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
          max: parseFloat(
            bnToDecimals(
              _get(sendTokenForm, [
                SEND_TOKEN_FIELDS.TOKEN,
                PORTFOLIO_COLUMNS.BALANCE
              ]),
              _get(sendTokenForm, [
                SEND_TOKEN_FIELDS.TOKEN,
                PORTFOLIO_COLUMNS.DECIMALS
              ])
            )
          )
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_AMOUNT_INVALID)
      ),
      isMinNumber(
        {
          name: SEND_TOKEN_FIELDS.TRANSFER_AMOUNT,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT]),
          min: 0
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_AMOUNT_INVALID)
      ),
      isMaxLength(
        {
          name: SEND_TOKEN_FIELDS.MESSAGE,
          value: _get(sendTokenForm, [SEND_TOKEN_FIELDS.MESSAGE]),
          max: 255
        },
        formatMessage(MSG.MY_WALLET_POPUP_SEND_TOKEN_ERROR_MESSAGE_MAXLENGTH)
      )
    ]);

    return errorList;
  }

  render() {
    const {
      intl: { formatMessage },
      onSetTableType,
      onToggleReceiveTokenPopup,
      onToggleSuccessPopup,
      onUpdateSendTokenInput,
      onUpdateSendTokenPopupStage,
      sendTokenForm,
      sendToKenPopup,
      successPopup,
      tableType,
      tokenOptions,
      wallet
    } = this.props;

    return (
      <Fragment>
        <Helmet>
          <title>{formatMessage(MSG.MY_WALLET_TITLE)}</title>
        </Helmet>
        <AddressInfo
          openReceiveTokenPopup={() => onToggleReceiveTokenPopup(true)}
          openSendTokenPopup={this.handleOpenSendTokenPopup}
          wallet={wallet}
        />
        <DataTables
          openReceiveTokenPopup={() => onToggleReceiveTokenPopup(true)}
          openSendTokenPopup={this.handleOpenSendTokenPopup}
          setTableType={onSetTableType}
          tableType={tableType}
        />
        <SendTokenPopup
          addFullAmount={this.handleAddFullAmount}
          closePopup={this.handleCloseSendTokenPopup}
          confirmBeforeSend={this.handleConfirmBeforeSend}
          formValues={sendTokenForm}
          popupData={sendToKenPopup}
          submitSendToken={this.handleGetSendAction}
          tokenOptions={tokenOptions}
          updateInput={onUpdateSendTokenInput}
          updateSendTokenPopupStage={onUpdateSendTokenPopupStage}
        />
        <SuccessPopup
          amount={_get(sendTokenForm, [SEND_TOKEN_FIELDS.TRANSFER_AMOUNT])}
          togglePopup={onToggleSuccessPopup}
          successPopup={successPopup}
          symbol={_get(
            sendTokenForm,
            [SEND_TOKEN_FIELDS.TOKEN, PORTFOLIO_COLUMNS.SYMBOL],
            ""
          )}
        />
        <ReceiveTokenPopup />
      </Fragment>
    );
  }
}
// ==========================

// ===== PROP TYPES =====
MyWallet.propTypes = {
  /** Rupaya coin data */
  coinData: PropTypes.object,
  /** React Intl's instance object */
  intl: PropTypes.object,
  /** Action to load Tomo coin data from CoinMarketCap */
  onLoadCoinData: PropTypes.func,
  /** Action to reset send token popup's form */
  onResetSendTokenForm: PropTypes.func,
  /** Action to refresh all My Wallet page's states */
  onResetState: PropTypes.func,
  /** Action to set current table tab */
  onSetTableType: PropTypes.func,
  /** Action to show/hide receive token popup */
  onToggleReceiveTokenPopup: PropTypes.func,
  /** Action to show/hide send token popup */
  onToggleSendTokenPopup: PropTypes.func,
  /** Action to show/hide success popup */
  onToggleSuccessPopup: PropTypes.func,
  /** Action to store send token form errors */
  onUpdateSendTokenErrors: PropTypes.func,
  /** Action to handle input change in send token form */
  onUpdateSendTokenInput: PropTypes.func,
  /** Action to update send token popup's stage of content */
  onUpdateSendTokenPopupStage: PropTypes.func,
  /** Send token popup's form values */
  sendTokenForm: PropTypes.object,
  /** Send token popup's data */
  sendToKenPopup: PropTypes.object,
  /** Success popup's data */
  successPopup: PropTypes.object,
  /** Current highlighted table tab */
  tableType: PropTypes.string,
  /** Action to show/hide loading screen */
  toggleLoading: PropTypes.func,
  /** List of token's data */
  tokenOptions: PropTypes.arrayOf(PropTypes.object),
  /** Current wallet's data */
  wallet: PropTypes.object
};

MyWallet.defaultProps = {
  intl: {},
  onResetSendTokenForm: () => {},
  onResetState: () => {},
  onSetTableType: () => {},
  onToggleReceiveTokenPopup: () => {},
  onToggleSendTokenPopup: () => {},
  onToggleSuccessPopup: () => {},
  onUpdateSendTokenErrors: () => {},
  onUpdateSendTokenInput: () => {},
  onUpdateSendTokenPopupStage: () => {},
  sendTokenForm: {},
  sendToKenPopup: {},
  successPopup: {},
  tableType: LIST.MY_WALLET_TABLE_TYPES[0].value,
  toggleLoading: () => {},
  tokenOptions: [],
  wallet: {}
};
// ======================

// ===== INJECTIONS =====
const mapStateToProps = () =>
  createStructuredSelector({
    sendTokenForm: selectSendTokenForm,
    sendToKenPopup: selectSendTokenPopup,
    successPopup: selectSuccessPopup,
    tableType: selectTableType,
    tokenOptions: selectTokenOptions,
    wallet: selectWallet
  });
const mapDispatchToProps = dispatch => ({
  onResetSendTokenForm: () => dispatch(resetSendTokenForm()),
  onResetState: () => dispatch(resetState()),
  onSetTableType: type => dispatch(setTableType(type)),
  onStoreWallet: wallet => dispatch(storeWallet(wallet)),
  onToggleReceiveTokenPopup: bool => dispatch(toggleReceiveTokenPopup(bool)),
  onToggleSendTokenPopup: (bool, initialValues) =>
    dispatch(toggleSendTokenPopup(bool, initialValues)),
  onToggleSuccessPopup: (bool, hash) =>
    dispatch(toggleSuccessPopup(bool, hash)),
  onUpdateSendTokenErrors: errors => dispatch(updateSendTokenErrors(errors)),
  onUpdateSendTokenInput: (name, value) =>
    dispatch(updateSendTokenInput(name, value)),
  onUpdateSendTokenPopupStage: stage =>
    dispatch(updateSendTokenPopupStage(stage))
});
const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: DOMAIN_KEY, reducer });
const withSaga = injectSaga({ key: DOMAIN_KEY, saga });
// ======================

export default compose(
  withConnect,
  withReducer,
  withSaga,
  withIntl,
  withRouter,
  withWeb3,
  withGlobal
)(MyWallet);
