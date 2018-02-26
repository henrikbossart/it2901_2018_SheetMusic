import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import MenuIcon from 'material-ui-icons/Menu';
import Divider from 'material-ui/Divider';
import GroupIcon from 'material-ui-icons/Group';
import DraftsIcon from 'material-ui-icons/Drafts';
import AccountCircleIcon from 'material-ui-icons/AccountCircle';
import { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import {
  Drawer, List, IconButton
} from 'material-ui';
import Button from 'material-ui/Button';

const styles = theme => ({
  root: {
    width: 300,
    height: '100vh',
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  input: {
    display: 'none',
  },
  joincreate: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  buttonSignout: {
    color: 'white',
    backgroundColor: 'rgb(255, 0, 80)',
    "&:hover": {
      backgroundColor: 'rgb(230, 0, 80)',
    },
  },
  bands: {
    height: '100%',
  }
});

class TemporaryDrawer extends React.Component {
  state = {
    left: false
  };

  toggleDrawer = (side, open) => () => {
    this.setState({
      [side]: open,
    });
  };

  render() {
    const { classes } = this.props;
    const bands = this.props.bands.map(band => <ListItem key={band.name}>{band.name}</ListItem>);
    return (
      <div>
      <IconButton color='default' onClick={this.toggleDrawer('left', true)}>
          <MenuIcon style={{color: 'white'}}/>
      </IconButton>
        <Drawer open={this.state.left} onClose={this.toggleDrawer('left', false)}>
          <div
            tabIndex={0}
            role='button'
            onClick={this.toggleDrawer('left', false)}
            onKeyDown={this.toggleDrawer('left', false)}
          >
            <div className={classes.root}>
              <List className={classes.profile}>
                <ListItem>
                  <ListItemIcon>
                    <AccountCircleIcon />
                  </ListItemIcon>
                  <ListItemText primary='Profile name' />
                </ListItem>
              </List>
              <Divider />
              <List className={classes.bands}>
                <ListItem>
                  <ListItemIcon>
                    <GroupIcon />
                  </ListItemIcon>
                  <ListItemText primary='Bands' />
                </ListItem>
                <div className={classes.joincreate}>
                  <Button variant='raised' color='default' className={classes.button}>
                    Join band
                  </Button>
                  <Button variant='raised' color='default' className={classes.button}>
                    Create band
                  </Button>
                </div>
                <List>
                  {bands}
                </List>
              </List>
              <Divider />
              <Button onClick={() => this.props.onSignOut()} variant='raised' color='default' className={classes.buttonSignout}>
                Sign out
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    );
  }
}

TemporaryDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(TemporaryDrawer);
