/**
 *
 * Wallet - My Wallet Page - Receive Token Popup - Receive Form
 *
 */
// ===== IMPORTS =====
// Modules
import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import _get from 'lodash.get';
import QRCode from 'qrcode.react';
// Custom Components
import { BoxImages, TextBlue } from '../../../../../../styles';
// Utilities & Constants
import { withIntl } from '../../../../../../components/IntlProvider';
import { selectWallet } from '../../../../../Global/selectors';
import { MSG } from '../../../../../../constants';
// ===================

// ===== MAIN COMPONENT =====
class ReceiveContent extends PureComponent {
  render() {
    const {
      intl: { formatMessage },
      wallet,
    } = this.props;
    return (
      <Fragment>
        <div className='text-center'>
          {formatMessage(MSG.MY_WALLET_POPUP_RECEIVE_TOKEN_CONTENT_MESSAGE)}
        </div>
        <BoxImages className='mt-5 mb-4'>
          <div className='qrc_bd'>
            <QRCode value={_get(wallet, 'address', '')} />
          </div>
        </BoxImages>
        <div className='text-center text-break'>
          <TextBlue>{_get(wallet, 'address', '')}</TextBlue>
        </div>
      </Fragment>
    );
  }
}
// ==========================

// ===== PROP TYPES =====
ReceiveContent.propTypes = {
  /** React Intl's instance object */
  intl: PropTypes.object,
  /** Current wallet's data */
  wallet: PropTypes.object,
};

ReceiveContent.defaultProps = {
  intl: {},
  wallet: {},
};
// ======================

// ===== INJECTIONS =====
const mapStateToProps = () =>
  createStructuredSelector({
    wallet: selectWallet,
  });
const withConnect = connect(mapStateToProps);
// ======================

export default compose(
  withConnect,
  withIntl,
)(ReceiveContent);
