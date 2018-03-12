import React, {Component} from 'react';
import {withStyles} from 'material-ui/styles';

import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';

import {
    Avatar, Card, CardContent, CardMedia, IconButton, List, ListItem, ListItemText, Menu, MenuItem, Paper, Tab,
    Tabs,
} from "material-ui";
import AddIcon from 'material-ui-icons/Add';
import MenuIcon from 'material-ui-icons/Menu';
import FileUploadIcon from 'material-ui-icons/FileUpload';

import firebase from 'firebase';
import CreateSetlistDialog from "../components/dialogs/CreateSetlistDialog";
import CreateScoreDialog from "../components/dialogs/CreateScoreDialog";
import UploadSheetsDialog from "../components/explorer/UploadSheetsDialog";
import AddInstrumentDialog from "../components/dialogs/AddInstrumentDialog";
import CreateBandDialog from "../components/dialogs/CreateBandDialog";
import JoinBandDialog from "../components/dialogs/JoinBandDialog";

import Drawer from '../components/Drawer.js';

const styles = {
    root: {},
    flex: {
        flex: 1
    },

    appBar: {
        flexWrap: 'wrap',
    },

    dialogContent: {
        display: 'flex',
        flexDirection: 'column'
    },
    card: {
        width: 270,
        marginRight: 24,
        marginBottom: 24,
        cursor: 'pointer'
    },
    media: {
        height: 150,
    },
    banner: {
        background: 'url(https://4.bp.blogspot.com/-vq0wrcE-1BI/VvQ3L96sCUI/AAAAAAAAAI4/p2tb_hJnwK42cvImR4zrn_aNly7c5hUuQ/s1600/BandPeople.jpg) center center no-repeat',
        backgroundSize: 'cover',
        height: 144
    },

    content: {
        paddingTop: 112
    },

    pageContainer: {
        display: 'flex',
        paddingTop: 20,
        justifyContent: 'center'
    }
};

class Band extends Component {
    state = {
        anchorEl: null,
        selectedPage: 1,
        band: {scores: []},
        uploadSheetsDialogOpen: false
    };

    unsubscribeCallbacks = [];

    signOut() {
      return firebase.auth().signOut();
    }

    async componentWillMount() {
        const bandId = this.props.detail;

        this.unsubscribeCallbacks.push(
            firebase.firestore().collection(`bands/${bandId}/scores`).onSnapshot(async snapshot => {
                for (let change of snapshot.docChanges) {
                    switch (change.type) {
                        case 'added':
                            const scoreDoc = await change.doc.data().ref.get();

                            this.unsubscribeCallbacks.push(
                                scoreDoc.ref.collection('sheetMusic').onSnapshot(async snapshot => {
                                    const sheetMusic = await Promise.all(
                                        snapshot.docs.map(async doc => {
                                            const instrumentRef = await doc.data().instrument.get();
                                            return {...doc.data(), id: doc.id, instrument: instrumentRef.data()}
                                        })
                                    );

                                    const scores = [...this.state.band.scores];

                                    scores.find(score => score.id === scoreDoc.id).sheetMusic = sheetMusic;

                                    this.setState({band: {...this.state.band, scores: scores}})
                                })
                            );

                            const scores = [...(this.state.band.scores || []), {...scoreDoc.data(), id: scoreDoc.id}];

                            this.setState({band: {...this.state.band, scores: scores}});
                            break;
                        case 'modified':
                            break;
                    }
                }
            })
        );

        this.unsubscribeCallbacks.push(
            firebase.firestore().collection(`bands/${bandId}/members`).onSnapshot(async snapshot => {
                const members = await Promise.all(snapshot.docs.map(async doc => {
                    const memberDoc = await doc.data().ref.get();
                    return {id: memberDoc.id, ...memberDoc.data()};
                }));

                this.setState({band: {...this.state.band, members: members}});
            })
        );

        // Band

        this.unsubscribe = firebase.firestore().collection(`users/${this.props.user.uid}/bands`).onSnapshot(async snapshot => {
          const bands = await Promise.all(snapshot.docs.map(async doc => {
            const bandDoc = await doc.data().ref.get();
            return {id: bandDoc.id, ...bandDoc.data()};
          }));

          this.setState({bands: bands});
        });

        const doc = await firebase.firestore().doc(`bands/${bandId}`).get();
        this.setState({band: doc.data()});

        // Instruments

        const snapshot = await doc.ref.collection('instruments').get();
        const instrumentsSorted = (await Promise.all(snapshot.docs
            .map(async doc => {
                const instrumentRef = await doc.data().ref.get();
                return {...instrumentRef.data(), id: instrumentRef.id};
            })))
            .sort((a, b) => a.name.localeCompare(b.name));

        this.setState({band: {...this.state.band, instruments: instrumentsSorted}});
    }

    componentWillUnmount() {
        this.unsubscribeCallbacks.forEach(c => c());
    }

    _onAddButtonClick(e) {
        this.setState({anchorEl: e.currentTarget});
    }

    _onMenuClose() {
        this.setState({anchorEl: null});
    }

    async createBand() {
        const uid = this.props.user.uid;

        this.setState({anchorEl: null})
        const {name} = await this.createDialog.open();

        try {
            const band = {
                name: name,
                creator: firebase.firestore().doc(`users/${uid}`),
                code: Math.random().toString(36).substring(2, 7)
            };

            let ref = await firebase.firestore().collection('bands').add(band);

            const instrumentIds = (await firebase.firestore().collection('instruments').get()).docs.map(doc => doc.id);
            await Promise.all(
                instrumentIds.map(id =>
                    ref.collection('instruments').add({ref: firebase.firestore().doc(`instruments/${id}`)}))
            );

            await firebase.firestore().collection(`users/${uid}/bands`).add({
                ref: firebase.firestore().doc(`bands/${ref.id}`)
            });
            window.location.hash = `#/band/${ref.id}`;
        } catch (err) {
            console.log(err);
        }
    }
    async joinBand() {
        const uid = this.props.user.uid;

        this.setState({anchorEl: null});
        const {code} = await this.joinDialog.open();

        let bandSnapshot = await firebase.firestore().collection('bands').where('code', '==', code).get();

        if (bandSnapshot.docs.length > 0) {
            let docRef = firebase.firestore().doc(`bands/${bandSnapshot.docs[0].id}`);

            let userBandSnapshot = await firebase.firestore().collection(`users/${uid}/bands`).where('ref', '==', docRef).get();

            if (userBandSnapshot.docs.length > 0) {
                this.setState({message: 'Band already joined!'});
            } else {
                await firebase.firestore().collection(`users/${uid}/bands`).add({ref: docRef});
                await docRef.collection('members').add({ref: firebase.firestore().doc(`users/${uid}`)});
                window.location.hash = `#/band/${docRef.id}`;
            }
          } else {
              this.setState({message: 'Band does not exist!'});
          }
    }

    async _onAddScore() {
        let uid = this.props.user.uid;
        let bandId = this.props.detail;

        const {title, composer} = await this.scoreDialog.open();

        try {
            const score = {
                title: title,
                composer: composer,
                creator: firebase.firestore().doc(`users/${uid}`),
                band: firebase.firestore().doc(`bands/${bandId}`)
            };

            let ref = await firebase.firestore().collection('scores').add(score);

            await firebase.firestore().collection(`bands/${bandId}/scores`).add({
                ref: firebase.firestore().doc(`scores/${ref.id}`)
            });
            // window.location.hash = `#/score/${ref.id}`;
        } catch (err) {
            console.log(err);
        }
    }

    _onAddInstrument = async (scoreId) => {
        try {
            let {instrument, instrumentNumber} = await this.addInstrumentDialog.open();

            await firebase.firestore().collection(`scores/${scoreId}/sheetMusic`).add({
                instrument: firebase.firestore().doc(`instruments/${instrument.id}`),
                instrumentNumber
            })
        } catch (err) {
            console.log(err);
        }
    }

    async _onMenuClick(type) {

        this.setState({anchorEl: null});

        switch (type) {
            case 'score':

                break;
            case 'setlist':
                const {name} = await this.setlistDialog.open();
                break;
            default:
                break;
        }
    }

    _onTabsChange(e, value) {
        this.setState({selectedPage: value});
    }

    _onUploadSheets = async (scoreId, sheetMusicId, sheetImages) => {
        const sheetMusicRef = firebase.firestore().doc(`scores/${scoreId}/sheetMusic/${sheetMusicId}`);

        await sheetMusicRef.update({uploading: true});

        const taskSnapshots = await Promise.all(
            sheetImages.map((image, index) =>
                firebase.storage().ref(`sheets/${scoreId}/${sheetMusicId}/${index}`).putString(image, 'data_url', {contentType: 'image/png'}))
        );

        await sheetMusicRef.update({
            uploading: firebase.firestore.FieldValue.delete(),
            sheets: taskSnapshots.map(snap => snap.downloadURL)
        });
    };

    async _onFileUploadButtonClick() {
        this.setState({uploadSheetsDialogOpen: true});
    }

    _onSheetsChange = async (scoreId, sheetMusicId, sheets) => {
        const sheetMusicRef = firebase.firestore().doc(`scores/${scoreId}/sheetMusic/${sheetMusicId}`);
        await sheetMusicRef.update({sheets: sheets});
    };

    render() {
        const {anchorEl, selectedPage, band, uploadSheetsDialogOpen} = this.state;
        const {classes} = this.props;

        return (
            <div className={classes.root}>
                <AppBar position="fixed" className={classes.appBar}>
                    <Toolbar>
                        <Drawer
                          onCreateBand={() => this.createBand()}
                          onJoinBand={() => this.joinBand()}
                          onSignOut={() => this.signOut()}
                          />
                          bands={this.state.bands}
                        <Typography variant="title" color="inherit" className={classes.flex}>
                            {band.name}
                        </Typography>
                        <IconButton color="inherit" onClick={() => this._onFileUploadButtonClick()}>
                            <FileUploadIcon/>
                        </IconButton>
                        <IconButton color="inherit" onClick={e => this._onAddButtonClick(e)}>
                            <AddIcon/>
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => this._onMenuClose()}
                        >
                            <MenuItem onClick={() => this._onMenuClick('score')}>Create Score</MenuItem>
                            <MenuItem onClick={() => this._onMenuClick('setlist')}>Create Setlist</MenuItem>
                        </Menu>
                    </Toolbar>
                    <Tabs
                        centered
                        value={selectedPage}
                        onChange={(e, value) => this._onTabsChange(e, value)}
                        indicatorColor='white'
                    >
                        <Tab label='Home'/>
                        <Tab label='Scores'/>
                        <Tab label='Setlists'/>
                        <Tab label='Members'/>
                    </Tabs>
                </AppBar>
                <div className={classes.content}>
                    {(() => {
                        switch (selectedPage) {
                            case 0:
                                return <div>
                                    <div className={classes.banner}></div>
                                </div>;
                            case 1:
                                return <div className={classes.pageContainer}>
                                    <div style={{display: 'flex', width: 600, flexWrap: 'wrap'}}>
                                        {band.scores && band.scores.map((arr, index) =>
                                            <Card key={index} className={classes.card}
                                                  onClick={() => window.location.hash = `#/score/${arr.id}`}
                                                  elevation={1}>
                                                <CardMedia
                                                    className={classes.media}
                                                    image="https://previews.123rf.com/images/scanrail/scanrail1303/scanrail130300051/18765489-musical-concept-background-macro-view-of-white-score-sheet-music-with-notes-with-selective-focus-eff.jpg"
                                                    title=""
                                                />
                                                <CardContent>
                                                    <Typography variant="headline" component="h2">
                                                        {arr.title}
                                                    </Typography>
                                                    <Typography component="p">
                                                        {arr.composer}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </div>;
                            case 2:
                                return <div className={classes.pageContainer}>Setlists</div>;
                            case 3:
                                return <div className={classes.pageContainer}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', width: 600}}>
                                        <Paper style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0 15px',
                                            width: 150,
                                            height: 50
                                        }}>
                                            <Typography variant='body1'>
                                                Band code
                                            </Typography>
                                            <Typography variant='body1'>
                                                <b>{band.code}</b>
                                            </Typography>
                                        </Paper>
                                        <Paper style={{width: 400}}>
                                            <List>
                                                {band.members && band.members.map((member, index) =>
                                                    <ListItem key={index} dense button>
                                                        <Avatar src={member.photoURL}/>
                                                        <ListItemText primary={member.displayName}/>
                                                    </ListItem>)}
                                            </List>
                                        </Paper>
                                    </div>
                                </div>;
                        }
                    })()}
                </div>
                <CreateScoreDialog onRef={ref => this.scoreDialog = ref}/>
                <CreateSetlistDialog onRef={ref => this.setlistDialog = ref}/>
                <CreateBandDialog onRef={ref => this.createDialog = ref}/>
                <JoinBandDialog onRef={ref => this.joinDialog = ref}/>
                <AddInstrumentDialog
                    band={band}
                    onRef={ref => this.addInstrumentDialog = ref}
                />
                <UploadSheetsDialog
                    band={band}
                    open={uploadSheetsDialogOpen}
                    onClose={() => this.setState({uploadSheetsDialogOpen: false})}
                    onAddScore={() => this._onAddScore()}
                    onAddInstrument={this._onAddInstrument}
                    onUploadSheets={this._onUploadSheets}
                    onSheetsChange={this._onSheetsChange}
                />
            </div>
        );
    }
}


export default withStyles(styles)(Band);
