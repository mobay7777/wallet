/**
 *
 * TomoWallet - Wallet Creation Page - Warning Component
 *
 * This component shows first warning about the upcoming generated recovery phrase,
 * which user has to store somewhere outside of the computer for security purpose.
 */
// ===== IMPORTS =====
// Modules
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardImg,
  CardTitle,
  CardText,
  CardFooter,
  Container,
  Row,
  Col,
} from 'reactstrap';
// Custom Components
// -- TO-DO: Update style for button & error text in the following styled components:
import {
  ButtonStyler,
  WarningImages,
} from '../../../../styles';
// Utilities & Constants
import { FORM_STATES } from '../constants';
import { withIntl } from '../../../../components/IntlProvider';
import { MSG, ROUTE } from '../../../../constants';
// -- TO-DO: Add style for Warning page
// IMAGES
import img_warning from '../../../../assets/images/img-warning.png';
// ===================

// ===== MAIN COMPONENT =====
class Warning extends PureComponent {
  constructor(props) {
    super(props);

    this.handleRedirect = this.handleRedirect.bind(this);
  }

  handleRedirect(newRoute) {
    const { history } = this.props;
    history.push(newRoute);
  }

  render() {
    const {
      intl: { formatMessage },
      setFormState,
    } = this.props;
    return (
      <Container fluid>
        <Row noGutters>
          <Col
            xs={12}
            sm={12}
            md={{ size: 10, offset: 1 }}
            lg={{ size: 6, offset: 3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{formatMessage(MSG.WARNING_HEADER_TITLE)}</CardTitle>
                <CardText>
                  {`${formatMessage(MSG.WARNING_HEADER_ALTERNATIVE_TEXT)} `}
                  <span
                    role='presentation'
                    onClick={() => this.handleRedirect(ROUTE.IMPORT_WALLET)}
                    className='d-inline-block'
                  >
                    {formatMessage(MSG.WARNING_HEADER_ALTERNATIVE_LINK)}
                  </span>
                </CardText>
              </CardHeader>
              {/* -- TO-DO: Add warning image's source */}
              <WarningImages>
                <CardImg src={ img_warning } alt={formatMessage(MSG.WARNING_IMAGE_ALT)} />
              </WarningImages>
              <CardBody>
                <CardTitle>
                  {formatMessage(MSG.WARNING_CONTENT_TITLE)}
                </CardTitle>
                <CardText>
                  {formatMessage(MSG.WARNING_CONTENT_DESCRIPTION)}
                </CardText>
                <CardText>
                  {formatMessage(MSG.WARNING_CONTENT_DESCRIPTION_DANGER)}
                </CardText>
              </CardBody>
              <CardFooter>
                <Container fluid className='px-0'>
                  <Row>
                    <Col size={6}>
                      <ButtonStyler
                        onClick={() => this.handleRedirect(ROUTE.LOGIN)}
                      >
                        {formatMessage(MSG.COMMON_BUTTON_BACK)}
                      </ButtonStyler>
                    </Col>
                    <Col size={6}>
                      <ButtonStyler
                        onClick={() =>
                          setFormState(FORM_STATES.RECOVERY_PHRASE)
                        }
                      >
                        {formatMessage(
                          MSG.WARNING_BUTTON_NEXT_TO_RECOVERY_PHRASE,
                        )}
                      </ButtonStyler>
                    </Col>
                  </Row>
                </Container>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }
}
// ==========================

// ===== PROP TYPES =====
Warning.propTypes = {
  /** React Intl's instance object */
  intl: PropTypes.object,
  /** React Router's API object */
  history: PropTypes.object,
  /** Action to update wallet creation form state */
  setFormState: PropTypes.func,
};
Warning.defaultProps = {
  intl: {},
  history: {},
  setFormState: () => {},
};
// ======================

export default compose(
  withIntl,
  withRouter,
)(Warning);
